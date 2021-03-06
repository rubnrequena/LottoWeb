socket.addListener(NetEvent.SOCKET_OPEN, socket_open);
socket.addListener(NetEvent.SOCKET_CLOSE, socket_close);
socket.addListener(NetEvent.LOGIN, socket_login);
socket.addListener(NetEvent.MESSAGE, socket_message);
socket.connect();

var pagarFlash;
var ultPagoConfirmado;

function socket_message() {
  //console.log("bytes",socket.bytesIn,socket.bytesOut,socket.bytesIn+socket.bytesOut);
}

function socket_open(e) {
  $("#conectando").fadeOut();
  var login = storage.getItem("loto_cmlogin");
  if (login) {
    socket.sendMessage("login", JSON.parse(login));
  } else {
    nav.navUrl();
  }
}

function socket_close(e) {
  $("#conectando").fadeIn();
  setTimeout(reload, 1000);
}

function reload() {
  location.reload();
}

function socket_login(e, d) {
  if (d.hasOwnProperty("code")) {
    if (d.code == 2) {
      nav.nav("login");
      notificacion(
        "DATOS INVALIDOS",
        "Verifique los datos introducidos y vuelva a intentar.",
        "growl-danger"
      );
    } else if (d.code == 505) {
      if (d) {
        nav.nav("suspendido", d);
      }
    } else
      notificacion(
        "INICIO DE SESION FALLIDO",
        "Razon desconocida, consulte con su administrador.",
        "growl-danger"
      );
  } else {
    $usuario = d.us;
    $bancas = d.bn;
    $elementos = d.el;
    $sorteos = d.st;
    $(".mn-usuario").html($usuario.usuario);
    //validar auditor
    if ($usuario.tipo == 3) {
      $(".noauditor").remove();
    }

    socket.sendMessage("balance-padre", null, function (e, d) {
      $balance = d;
      if ($balance) {
        $("#menu-balance-date").html(d[0].fecha);
        for (var i = 0; i < $balance.length; i++) {
          if ($balance[i].c == 1) {
            ultPagoConfirmado = $balance[i];
            if ($balance[i].balance > 0) {
              $("#tmenu-pagar").html(
                jsrender($("#rd-tmenupagar"), $balance[i])
              );
              $("#pagar-btn").click(() => {
                var cp = 0;
                $balance.forEach(function (item) {
                  if (item.cdo == 0) cp++;
                });

                if (cp <= 3)
                  askme(
                    "PROCESAR PAGO #" + ultPagoConfirmado.balID,
                    jsrender($("#rd-procesar-deuda"), ultPagoConfirmado),
                    {
                      ok: function (result) {
                        var monto = parseFloat(result.monto) * -1;
                        var data = {
                          desc:
                            "PAGO:" +
                            result.id +
                            " B:" +
                            padding(result.origen, 4) +
                            "-" +
                            padding(result.destino, 4) +
                            " R:" +
                            result.recibo +
                            " F:" +
                            result.fecha,
                          monto: monto,
                          resID: bi.resID,
                          usID: bi.usID,
                        };
                        socket.sendMessage("balance-pago", data, function (
                          e,
                          d
                        ) {
                          d.balance = "--";
                          $balance.unshift(d);
                          $("#reporte-body").html(
                            jsrender($("#rd-reporte-us"), $balance)
                          );
                          $(".bl-pagar").click(balance_pago_click);
                          notificacion("PAGO ENVIADO EXITOSAMENTE");
                        });
                        return true;
                      },
                    }
                  );
                else
                  notificacion(
                    "LIMITE DE PAGOS ALCANZADO",
                    "Estimado usuario, ya has alcanzado el limite de pagos sin confirmar, comuniquese con su administrador."
                  );
              });
              pagarFlash = setInterval(() => {
                var fl = $("#tmenu-pagarflash");
                fl.toggleClass("text-success");
              }, 1000);
            }
            $("#menu-balance-value").html(
              '<i class="fa fa-dollar"></i> ' + $balance[i].balance.format(2)
            );
            break;
          }
        }
      }
      nav.navUrl();

      socket.sendMessage("chat-bandeja", null, function (e, d) {
        d = d || [];
        $("#msg-count").html(d.length);
        $("#msg-sinleer").html(jsrender($("#rd-msg"), d));
        $mensajes = d;
      });
    });
  }
}
$(".logout").click(function (e) {
  e.preventDefault(e);
  $usuario = null;
  $bancas = null;
  $elementos = null;
  $sorteos = null;
  storage.removeItem("loto_cmlogin");
  nav.nav("inicio");
});

//UI
//ANULAR
socket.addListener("venta-anular-banca", function (e, d) {
  notificacion(
    "TICKET ANULADO POR BANCA",
    "TICKET #" + d,
    "growl-success",
    true
  );
});
$("#vnt-anular").submit(function (e) {
  e.preventDefault(e);
  var data = formControls(this);
  var f = formLock(this);
  socket.sendMessage("venta-anular", data, function (e, d) {
    formReset(f);
    if (d.hasOwnProperty("code")) {
      if (d.code == 2) notificacion("TICKET NO EXISTE");
      else if (d.code == 4) notificacion("TICKET YA SE ENCUENTRA ANULADO");
      else if (d.code == 5) notificacion("TICKET INVALIDO", "TICKET CADUCADO");
    } else {
      $("#md-anularTicket").modal("hide");
      notificacion(
        "TICKET ANULADO",
        "TICKET #" + data.ticketID,
        "growl-success"
      );
    }
  });
});
$("#md-anularTicket").on("shown.bs.modal", function (e) {
  var bancas = $("#md-anular-bancas");
  bancas.html(jsrender($("#rd-banca-option"), $bancas));
  //bancas.select2("val",0);

  var input = $("#md-anular-ticket");
  input.val("");
  input.focus();
});
//PREMIAR
var hlp = {
  formatDate: dateFormat,
  formatNumber: formatNumber,
  padding: padding,
};
$("#vnt-pagar").submit(function (e) {
  e.preventDefault(e);
  var data = formControls(this);
  var f = formLock(this);
  socket.sendMessage("venta-premios", data, function (e, d) {
    formLock(f, false);
    if (d.hasOwnProperty("code")) {
      notificacion("TICKET NO EXISTE", "");
    } else {
      $("#md-pagar-tpremio").html(jsrender($("#rd-premio-ticket"), [d.tk]));
      $("#md-pagar-prms").html(jsrender($("#rd-premio-premios"), d.prm, hlp));
      $(".pagar-premio").click(function (e) {
        var btn = $(e.target);
        var venta = btn.data("id");
        var ticket = btn.data("ticket");
        var codigo = $("#md-pagar-codigo").val();
        btn.prop("disabled", true);
        socket.sendMessage(
          "venta-pagar",
          {
            id: venta,
            tk: ticket,
            cod: codigo,
          },
          function (e, d) {
            if (d.hasOwnProperty("code")) {
              notificacion(
                "#" + ticket + ": PAGO NO PROCESADO",
                "CODIGO INVALIDO o TICKET EXPIRO",
                "growl-danger"
              );
              btn.prop("disabled", false);
            } else btn.html('<i class="fa fa-check"></i>');
          }
        );
      });
    }
  });
});
var mdTicket = $("#md-ticket");
mdTicket.on("shown.bs.modal", function (e) {
  var input = $("#md-pagar-ticket");
  input.val("");
  input.focus();
});
mdTicket.on("hidden.bs.modal", function (e) {
  $("#md-pagar-ticket").val("");
  $("#md-pagar-codigo").val("0");
  $("#md-pagar-tpremio").html("");
  $("#md-pagar-prms").html("");
});
select2w($("#md-anular-bancas"));
//END UI
