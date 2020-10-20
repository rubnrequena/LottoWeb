nav.paginas.addListener(Navegador.ENTER, function (p, a) {
  // Adjust mainpanel height
  var main = jQuery(".mainpanel");
  var docHeight = jQuery(document).height();
  var mh = main.height();
  if (docHeight > mh) main.height(docHeight);

  $(".date").datepicker({
    dateFormat: "yy-mm-dd",
  });

  $(".now").datepicker("setDate", new Date());

  $(".s2-elementos").html(jsrender($("#rd-elemento-option"), $elementos));
  $(".s2-bancas").html(jsrender($("#rd-banca-option"), $bancas));
});
nav.paginas.addListener(Navegador.COMPLETE, function (p, a) {
  select2w($(".s2"), {
    allowClear: true,
  });

  // Minimize Button in Panels
  var heading = jQuery(".panel-heading");
  heading.attr("title", "Click para expandir y/o contraer panel");
  heading.click(function (e) {
    var t = jQuery(this).find(".minimize");
    var p = t.closest(".panel");
    if (!t.hasClass("maximize")) {
      p.find(".panel-body, .panel-footer").slideUp(200);
      t.addClass("maximize");
      t.html("&plus;");
    } else {
      p.find(".panel-body, .panel-footer").slideDown(200);
      t.removeClass("maximize");
      t.html("&minus;");
    }
    return false;
  });
});

nav.paginas.addListener("login", login_nav);

function login_nav(p, arg) {
  $("#login-form").submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    var f = formLock(this);
    socket.sendMessage("login", data, function (e, d) {
      formLock(f, false);
      var recordar = $("#recordar").prop("checked");
      if (recordar) storage.setItem("loto_cmlogin", JSON.stringify(data));
      else storage.removeItem("loto_cmlogin");
    });
  });
}

nav.paginas.addListener("inicio", inicio_nav);

function inicio_nav(p, arg) {
  var rdia;
  var hlp = copyTo(_helpers);
  hlp.ganador = function (n) {
    var e = findBy("id", n, $elementos);
    return e ? "#" + e.n + " " + e.d : "";
  };

  nav.paginas.addListener(Navegador.EXIT, function (e, p) {
    nav.paginas.removeListener(Navegador.EXIT, arguments.callee);
    if (p == "inicio") activo = false;
  });

  $("#btnload").click(function () {
    $("#inicio-sorteodia").html(jsrender($("#rd-pnlsorteo"), null));
    $(".date").datepicker({
      dateFormat: "yy-mm-dd",
    });
    $(".now").datepicker("setDate", new Date());

    $("#reporte-fecha1").change(function (e) {
      var fecha = $(this).val();
      getReporte(fecha);
    });

    var col = false;
    $("#prm-col").click(function (e) {
      e.preventDefault(e);
      col = !col;
      $(this)
        .find("a")
        .html(col ? "PREMIOS</br>PAGADOS" : "PREMIOS</br>A PAGAR");
      if (col)
        $("#srt_dia").html(jsrender($("#rd-sorteos-dia1-row"), rdia, hlp));
      else $("#srt_dia").html(jsrender($("#rd-sorteos-dia2-row"), rdia, hlp));
    });

    if ($elementos) {
      getReporte();
    } else {
      socket.sendMessage("elementos", null, function (e, d) {
        $elementos = d;
        getReporte();
      });
    }

    function getReporte(f) {
      f = f || new Date().format();
      socket.sendMessage(
        "inicio",
        {
          fecha: f,
        },
        function (e, d) {
          $("#srt_dia").html("");
          if (d.hasOwnProperty("code")) {
          } else {
            rdia = d.data;
            var t1 = 0,
              t2 = 0,
              t3 = 0;
            for (var i = 0; i < rdia.length; i++) {
              t1 += rdia[i].jugado;
              t2 += rdia[i].premios;
              t3 += rdia[i].pago;
            }
            rdia.push({
              sorteoID: "",
              sorteo: "TOTAL",
              jugado: t1,
              premios: t2,
              pago: t3,
            });
            $("#srt_dia").html(
              jsrender($("#rd-sorteos-dia2-row"), d.data, hlp)
            );
          }
          $("#str-dia-stamp").html(new Date(d.time).format("hh:MM TT"));
        }
      );
    }
  });

  if ($balance) {
    $("#reporte-body").html(jsrender($("#rd-reporte-us"), $balance));
    for (var i = 0; i < $balance.length; i++) {
      if ($balance[i].c == 1) {
        $("#bl-my-total").html($balance[i].balance.format(2));
        break;
      }
    }
    $(".bl-pagar").click(balance_pago_click);
  }

  function balance_pago_click(e) {
    e.preventDefault(e);
    var pago = $(this).attr("pago");
    var bi = findBy("balID", pago, $balance);

    var cp = 0;
    $balance.forEach(function (item) {
      if (item.cdo == 0) cp++;
    });

    if (cp <= 3)
      askme("PROCESAR PAGO #" + pago, jsrender($("#rd-procesar-pago"), bi), {
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
          };
          socket.sendMessage("balance-pago", data, function (e, d) {
            d.balance = "--";
            $balance.unshift(d);
            $("#reporte-body").html(jsrender($("#rd-reporte-us"), $balance));
            $(".bl-pagar").click(balance_pago_click);
            notificacion("PAGO ENVIADO EXITOSAMENTE");
          });
          return true;
        },
      });
    else
      notificacion(
        "LIMITE DE PAGOS ALCANZADO",
        "Estimado usuario, ya has alcanzado el limite de pagos sin confirmar, comuniquese con su administrador."
      );
  }
}

function suspendido_nav(p, args) {
  var detalle = $("#suspDetalle");
  var suspPayBtn = $("#suspPayBtn");

  if (args.hasOwnProperty("info")) {
    var deuda = args.info.balance;
    detalle.html("Tiene una deuda pendiente de <b>" + deuda + "</b>");

    var pago = args.info;

    suspPayBtn.removeClass("hidden");
    suspPayBtn.click(reqPago);

    function reqPago() {
      askme(
        "PROCESAR PAGO #" + pago.balID,
        jsrender($("#rd-procesar-pago"), pago),
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
              resID: pago.resID,
            };
            suspPayBtn.prop("disabled", true);
            socket.sendMessage("balance-pago", data, function (e, d) {
              notificacion(
                "PAGO PROCESADO",
                d.msg +
                  '<br/><button class="btn btn-success btn-xs btn-block" onclick="location.reload();">Refrescar</button>',
                null,
                true
              );
            });
            return true;
          },
        }
      );
    }
  } else {
    suspPayBtn.style("visible", "none");
  }
}
nav.paginas.addListener("suspendido", suspendido_nav);

function suspendidoPago_nav(p, args) {}
nav.paginas.addListener("suspendido_pago", suspendidoPago_nav);

function sorteoMonitor_nav() {
  var d = new Date();
  listarSorteos(d.format());
  var data;

  $("#ord-num-num").click(function (e) {
    e.preventDefault(e);
    $(".order-num").removeClass("btn btn-primary btn-sm");
    $(this).addClass("btn btn-primary btn-sm");
    data.n.sort(function (a, b) {
      return a.numero - b.numero;
    });
    $("#numeros-body").html(jsrender($("#rd-vtnum-row"), data.n));
  });
  $("#ord-num-jg").click(function (e) {
    e.preventDefault(e);
    $(".order-num").removeClass("btn btn-primary btn-sm");
    $(this).addClass("btn btn-primary btn-sm");
    data.n.sort(function (a, b) {
      return b.jugada - a.jugada;
    });
    $("#numeros-body").html(jsrender($("#rd-vtnum-row"), data.n));
  });
  $("#ord-num-gb").click(function (e) {
    e.preventDefault(e);
    $(".order-num").removeClass("btn btn-primary btn-sm");
    $(this).addClass("btn btn-primary btn-sm");
    data.n.sort(function (a, b) {
      return b.glb - a.glb;
    });
    $("#numeros-body").html(jsrender($("#rd-vtnum-row"), data.n));
  });

  $("#monitor-form").submit(function (e) {
    e.preventDefault(e);
    $("#ventas-body").html("");
    $("#numeros-body").html("");
    $(".reset").html("--");

    var dataForm = formControls(this);
    if (!dataForm.sorteoID) {
      notificacion("SELECCIONE UN SORTEO VALIDO");
      return;
    }
    var f = formLock(this);
    socket.sendMessage("monitor", dataForm, function (e, d) {
      formLock(f, false);
      if (d.t == null || d.n == null) {
        notificacion("NO HAY VENTAS REGISTRADAS PARA ESTE SORTEO");
        return;
      }
      data = d;
      var now = new Date();
      $("#ultact").html(now.format("dd/mm/yy hh:MM:ss TT"));

      if (data.t && data.n) {
        var jg = 0,
          tg = 0;
        var ld = data.t[0];
        data.t.forEach(function (item) {
          jg += item.jugada;
          if (item.jugada > ld.jugada) ld = item;
        });

        $("#jugada").html(jg.format(2));
        $("#bnLider").html(ld.banca);
        $("#bnLider-jg").html(ld.jugada.format(2));

        ld = data.n[0];
        data.n.forEach(function (item) {
          tg += item.glb;
        });
        data.n.forEach(function (item) {
          item.pcj = (item.jugada * 100) / jg;
          item.pcg = (item.glb * 100) / tg;
          if (item.jugada > ld.jugada) ld = item;
        });
        $("#numLider").html(ld.desc);
        $("#numLider-jg").html(ld.jugada.format(2));

        $("#ventas-body").html(jsrender($("#rd-ventas-row"), data.t));
        $("#numeros-body").html(jsrender($("#rd-vtnum-row"), data.n));
      }
    });
  });

  $("#sfecha").on("change", function (e) {
    listarSorteos(e.target.value);
  });

  function listarSorteos(fecha) {
    socket.sendMessage(
      "sorteos",
      {
        fecha: fecha,
      },
      function (e, d) {
        var sorteo = $("#ssorteos");
        sorteo.html(jsrender($("#rd-sorteo-option"), d));
        sorteo.select2("val", "");
      }
    );
  }
}
nav.paginas.addListener("sorteos/monitor", sorteoMonitor_nav);

function sorteoBuscar_nav(p, args) {
  $("#sorteo-buscar").submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    var f = formLock(this);
    socket.sendMessage("sorteos", data, function (e, d) {
      formLock(f, false);
      $("#sorteos-body").html(jsrender($("#rd-sorteo-row"), d || []));
    });
  });
}
nav.paginas.addListener("sorteos/buscar", sorteoBuscar_nav);

function sorteoPublicar_nav(p, args) {
  var tq_srt, taquillas, grupos;
  var hlp = {
    taq: function (id) {
      if (id > 0) {
        var tq = findBy("taquillaID", id, taquillas);
        return tq ? tq.nombre : "ERROR: TAQ NO ENCONTRADA, ID:" + id;
      } else return "TODAS";
    },
    srt: function (id) {
      return findBy("sorteoID", id, $sorteos);
    },
  };
  var bancas = $("#bancas"),
    taqs = $("#taquillas"),
    sorteos = $("#sorteos"),
    htaq = $("#hb-taquilla"),
    grupos_s2 = $("#grupos"),
    rdGrupo_op = $("#rd-grupo-option");

  bancas.html(jsrender($("#rd-usuario-option"), $bancas));
  bancas.select2("val", 0);
  bancas.on("change", bancas_onChange);
  grupos_s2.on("change", grupos_onChange);

  sorteos.html(jsrender($("#rd-sorteos-option"), $sorteos));

  $("#reporte").submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    data.bancaID = grupos_s2.val();
    if (!data.hasOwnProperty("taquillas")) data.taquillas = [0];

    var i,
      j,
      ex = [];
    for (i = data.taquillas.length - 1; i >= 0; i--) {
      for (j = tq_srt.length - 1; j >= 0; j--) {
        if (
          data.taquillas[i] == tq_srt[j].taquilla &&
          data.sorteo == tq_srt[j].sorteo
        ) {
          ex.push(tq_srt[j].ID);
        }
      }
    }

    if (ex.length > 0) {
      notificacion("REGISTROS DUPLICADOS, POR FAVOR VERIFIQUE");
      ex.forEach(function (item, i) {
        $("#r" + item).addClass("danger");
      });
    } else {
      socket.sendMessage("publicar", data, function (e, d) {
        socket.sendMessage(
          "sorteos-publicos",
          {
            bancaID: grupos_s2.val(),
          },
          sorteos_publicos
        );
      });
    }
  });

  function sorteos_publicos(e, d) {
    tq_srt = d || [];
    updateView();
  }

  function updateView() {
    $("#tb-sorteos").html(jsrender($("#rd-srt-row"), tq_srt, hlp));
    var toggles = $(".toggle");
    toggles.each(function (index) {
      var me = $(this);
      me.toggles({
        text: {
          on: "SI",
          off: "NO",
        },
        on: me.data("activa"),
        click: true,
      });
    });
    toggles.on("toggle", function (e, act) {
      var id = $(e.target).data("target");
      var taquilla = findBy("ID", id, tq_srt);
      socket.sendMessage(
        "pb_editar",
        {
          id: taquilla.ID,
          publico: act,
          bancaID: grupos_s2.val(),
        },
        function (e, d) {
          taquilla.publico = act;
        }
      );
    });

    $(".tqsrt_rem").on("click", remover_publicacion);
  }

  function remover_publicacion(e) {
    var _id = parseInt($(e.target).attr("sid"));
    socket.sendMessage(
      "pb_remover",
      {
        id: _id,
        bancaID: bancas.val(),
      },
      function (e, d) {
        var i = findIndex("ID", _id, tq_srt);
        tq_srt.splice(i, 1);
        updateView();
      }
    );
  }

  function updateTaquillas(e, d) {
    htaq.html("");
    taquillas = d || [];
    taquillas.unshift({
      taquillaID: 0,
      nombre: "TODAS",
    });
    taqs.html(jsrender($("#rd-taquilla-option"), taquillas));

    socket.sendMessage(
      "sorteos-publicos",
      {
        bancaID: grupos_s2.val(),
      },
      sorteos_publicos
    );
  }
  function updateGrupos(e, d) {
    grupos = d || [];
    grupos_s2.html(jsrender(rdGrupo_op, grupos));
    grupos_s2.select2("val", null);
  }

  function bancas_onChange() {
    htaq.html(
      '<i class="fa fa-spinner fa-spin"></i> Espere, recibiendo taquillas..'
    );
    socket.sendMessage(
      "usuario-grupos",
      { usuarioID: bancas.val() },
      updateGrupos
    );
  }
  function grupos_onChange() {
    socket.sendMessage(
      "taquillas",
      { banca: grupos_s2.val() },
      updateTaquillas
    );
  }
}
nav.paginas.addListener("sorteos/publicar", sorteoPublicar_nav);

function sorteoPremiar_nav(p, args) {
  var sorteo = $("#premiar-sorteo"),
    numeros = $("#premiar-numero"),
    opt = $("#rd-sorteo-option"),
    rdElm = $("#rd-elemento-option");
  var sorteos;

  $(".date").on("change", function (e) {
    listarSorteos(e.target.value);
  });
  sorteo.on("change", function () {
    listarNumeros(sorteo.val());
  });
  $("#premiar-form").submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    var form = formLock(this);
    socket.sendMessage("sorteo-premiar", data, function (e, d) {
      formLock(form, false);
      if (d.code == 1) {
        notificacion(
          "SOLICITUD ACEPTADA",
          "SORTEO PREMIADO, Gracias por su tiempo..."
        );
      } else if (d.code == 0) {
        notificacion("SOLICITUD ACEPTADA", "Gracias por su tiempo...");
      } else if (d.code == 4)
        notificacion(
          "SORTEOS",
          "SORTEO #" + data.sorteoID + " YA ESTA PREMIADO",
          "growl-danger"
        );
      else if (d.code == 5)
        notificacion(
          "SOLICITUD RECHAZADA",
          " SORTEO #" + data.sorteoID + " SOLICITUD DUPLICADA",
          "growl-danger"
        );
      else if (d.code == 8)
        notificacion(
          "SOLICITUD RECHAZADA",
          " SORTEO #" + data.sorteoID + " SORTEO ABIERTO",
          "growl-danger"
        );
    });
  });

  function listarSorteos(fecha) {
    socket.sendMessage(
      "sorteos",
      {
        fecha: fecha,
      },
      function (e, d) {
        sorteos = d || [];
        var sorteo = $("#premiar-sorteo");
        sorteo.html(jsrender(opt, sorteos));
        sorteo.select2("val", "");
      }
    );
  }

  function listarNumeros(sorteo) {
    var srt = findBy("sorteoID", sorteo, sorteos);
    numeros.html(jsrender(rdElm, exploreBy("s", srt.sorteo, $elementos)));
  }
  var hoy = new Date().format();

  if ($elementos) {
    listarSorteos(hoy);
  } else {
    socket.sendMessage("elementos", null, function (e, d) {
      $elementos = d;
      listarSorteos(hoy);
    });
  }
}
nav.paginas.addListener("sorteos/premiar", sorteoPremiar_nav);
function sorteoComisiones_nav(p, args) {
  const rd_operadora_option = $("#rd-operadora-option");
  const rd_grupo_option = $("#rd-banca-option");
  const rd_banca_option = $("#rd-usuario-option");
  const rd_comision_row = $("#rd-comision-row");
  const operadoras_select = $("#operadoras");
  const bancas_select = $("#bancas");
  const grupo_select = $("#grupos");
  const comision_form = $("#comision-form");
  const bancas_body = $("#bancas_body");
  const rm_comision = ".rm_comision";
  const todos = { bancaID: "", usuarioID: "", nombre: "SELECCIONE..." };

  function init() {
    operadoras_select.html(jsrender(rd_operadora_option, [todos, ...$sorteos]));
    operadoras_select.change(operadora_change);
    bancas_select.html(jsrender(rd_banca_option, [todos, ...$bancas]));
    bancas_select.select2("val", "");
    bancas_select.change(bancas_change);
    comision_form.submit(comision_nuevo);
    grupo_select.select2("val", "");
    grupo_select.change(operadora_change);
  }
  function operadora_change() {
    let data = formControls(comision_form);
    let rol = data.usuario == "" || data.usuario[1] == "" ? "banca" : "grupo";
    let usuario = "";
    if (rol == "grupo") usuario = data.usuario[0];
    socket.sendMessage(
      `comisiones_${rol}`,
      { operadora: data.operadora, usuario },
      (e, d) => {
        bancas_body.html(jsrender(rd_comision_row, d));
        $(rm_comision).click(remover_comision);
      }
    );
  }
  function bancas_change(event) {
    socket.sendMessage("usuario-grupos", { usuarioID: event.val }, (e, d) => {
      grupo_select.html(jsrender(rd_grupo_option, [todos, ...d]));
    });
  }
  function comision_nuevo(e) {
    e.preventDefault(e);
    let data = formControls(this);
    data.rol = data.usuario[1] == "" ? 3 : 2;
    data.usuario = data.usuario
      .reverse()
      .find((item) => isNaN(parseInt(item)) == false);
    formLock(this);
    socket.sendMessage("comision_producto_nv", data, (e, d) => {
      formLock(comision_form, false);
      if (d.error) return notificacion("Error al registrar comision", d.error);
      operadora_change();
    });
  }
  function remover_comision(e) {
    e.preventDefault(e);
    let usuario = $(e.currentTarget).attr("usuario");
    let data = formControls(comision_form);
    socket.sendMessage(
      "comision_producto_rm",
      { usuario, operadora: data.operadora },
      (e, d) => {
        notificacion("COMISION RESTABLECIDA A VALORES PREDETERMINADOS");
        operadora_change();
      }
    );
  }
  init();
}
nav.paginas.addListener("sorteos/comisiones", sorteoComisiones_nav);

function bancasBancas_nav(p, args) {
  var papelera = $("#papelera");

  papelera.change(function () {
    updateBancas();
  });

  $("#banca-nueva").submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    data.comision = data.comision / 100;
    data.participacion = data.participacion / 100;
    data.renta = $usuario.renta;
    if ($("#alquiler").is(":checked")) data.comision = data.comision * -1;
    var form = formLock(this);
    socket.sendMessage("usuario-nuevo", data, function (e, d) {
      if (d > 0) {
        formReset(form);
        data.usuarioID = d;
        data.renta = $usuario.renta;
        $bancas.push(data);
        updateBancas();
        notificacion("BANCA NUEVA", "Banca registrada exitosamente");
      } else {
        formLock(form, false);
        notificacion(
          "ERROR",
          "Banca no registrada, usuario duplicado",
          "growl-danger"
        );
      }
    });
  });
  updateBancas();

  function updateBancas() {
    /*var _papelera = papelera.prop('checked');

    $bancas = $bancas.sort(function (a,b) {
        if (a.papelera< b.papelera) return -1;
        else if (a.papelera> b.papelera) return 1;
        else {
            if (a.activa< b.activa) {
                return 1;
            } else if (a.activa> b.activa) {
                return -1;
            } else return a.bancaID- b.bancaID;
        }
    });

    $('#bancas-body').html(jsrender($('#rd-banca-row'),$bancas.filter(function (a) {
        return a.papelera==_papelera;
    })));
     */
    $("#bancas-body").html(jsrender($("#rd-banca-row"), $bancas));

    var toggles = $(".toggle");
    toggles.each(function (index) {
      var me = $(this);
      me.toggles({
        text: {
          on: "SI",
          off: "NO",
        },
        on: me.data("activa"),
        click: true,
      });
    });
    $(".btgl").on("toggle", function (e, act) {
      var id = $(e.target).data("target");
      var banca = findBy("usuarioID", id, $bancas);
      act = act == 1 ? 3 : 0;
      socket.sendMessage(
        "usuario-editar",
        {
          usuarioID: banca.usuarioID,
          activo: act,
        },
        function (e, d) {
          if (d.code == 1) {
            if (d.hasOwnProperty("activa")) banca.activo = d.activo;
            if (d.hasOwnProperty("nombre")) banca.nombre = d.nombre;
            if (d.hasOwnProperty("clave")) banca.clave = d.clave;
          } else {
            alert("ERROR AL MODIFICAR ESTADO ACTIVO DE BANCA");
          }
        }
      );
    });

    var psw = $(".password");
    psw.on("mouseover", function (e) {
      $(e.target).html($(e.target).data("clave"));
    });
    psw.on("mouseout", function (e) {
      $(e.target).html("***");
    });

    $(".bn-remove-req").click(function (e) {
      e.preventDefault(e);
      var bID = $(this).attr("bancaID");
      var r = confirm(
        "Seguro desea eliminar esta banca? Tenga en cuenta que enviara a la papelera todas las taquillas asociadas."
      );
      if (r === true) {
        socket.sendMessage(
          "banca-remover",
          {
            bancaID: bID,
            papelera: 1,
          },
          function (e, d) {
            if (d.code == 1) {
              var b = findBy("bancaID", bID, $bancas);
              b.papelera = 1;
              updateBancas();
            }
          }
        );
      }
      return false;
    });
    $(".bn-remove-res").click(function (e) {
      e.preventDefault(e);
      var bID = $(this).attr("bancaID");
      var r = confirm(
        "Seguro desea restaurar esta banca?  Tenga en cuenta que restaurara todas las taquillas asociadas."
      );
      if (r === true) {
        socket.sendMessage(
          "banca-remover",
          {
            bancaID: bID,
            papelera: 0,
          },
          function (e, d) {
            if (d.code == 1) {
              var b = findBy("bancaID", bID, $bancas);
              b.papelera = 0;
              updateBancas();
            }
          }
        );
      }
      return false;
    });
  }
}
nav.paginas.addListener("bancas/bancas", bancasBancas_nav);

function bancasBanca_nav(p, args) {
  if (args && args.length == 1) {
    var editar = $("#banca-nueva");
    var clave = $("#banca-psw");
    var renta = $("#banca-renta");
    var banca, grupos;

    var papelera = $("#papelera");
    papelera.change(function () {
      updateGrupos();
    });

    editar.submit(function (e) {
      e.preventDefault(e);
      var data = formControls(this);
      data.usuarioID = banca.usuarioID;
      data.comision = data.comision / 100;
      if ($("#alquiler").is(":checked")) {
        data.comision = data.comision * -1;
      }
      data.participacion = data.participacion / 100;
      data.renta = banca.renta;
      formLock(this);
      socket.sendMessage("usuario-editar", data, function (e, d) {
        formLock(editar[0], false);
        if (d.code == 1) {
          notificacion("Cambios guardados con exito");
          banca.activa = data.activa;
          banca.nombre = data.nombre;
          banca.comision = data.comision;
          banca.usuario = data.usuario;
          banca.clave = data.clave;
        } else notificacion("Error al realizar cambios", "", "growl-danger");
      });
    });
    var multiplo = 0;
    $("#grupo-nuevo").submit(function (e) {
      e.preventDefault(e);
      var data = formControls(this);
      data.usuarioID = banca.usuarioID;
      data.renta = $usuario.renta;
      data.comision = data.comision * multiplo;
      var form = formLock(this);
      socket.sendMessage("banca-nueva", data, function (e, d) {
        if (d > 0) {
          formReset(form);
          data.bancaID = d;
          data.papelera = 0;
          grupos.push(data);
          updateGrupos();
          notificacion("BANCA NUEVA", "Banca registrada exitosamente");
        } else {
          formLock(form, false);
          notificacion(
            "ERROR",
            "Banca no registrada, usuario duplicado",
            "growl-danger"
          );
        }
      });
    });
    renta.submit(function (e) {
      e.preventDefault(e);
      var data = formControls(this);
      data.bancaID = banca.bancaID;
      data.renta = data.renta / 100;
      formLock(this);
      socket.sendMessage("banca-editar", data, function (e, d) {
        formLock(renta[0], false);
        if (d == 1) notificacion("Cambios guardados con exito");
        else notificacion("Error al realizar cambios", "", "growl-danger");
      });
    });
    clave.submit(function (e) {
      e.preventDefault(e);
      formLock(this);
      var data = formControls(this);
      data.usuarioID = banca.usuarioID;
      socket.sendMessage("banca-editar", data, function (e, d) {
        formReset(clave[0]);
        if (d.code == 1) {
          notificacion("Cambio de clave exitoso");
          if (d.hasOwnProperty("clave")) banca.clave = d.clave;
        } else notificacion("Cambio de clave fallido", "", "growl-danger");
      });
    });
    $(".rdo-com").change(function () {
      multiplo = this.value;
      $("#gr-comision").prop("disabled", this.value == 0);
    });

    banca = findBy("usuarioID", args[0], $bancas);
    if (banca.comision < 0) $("#alquiler").prop("checked", 1);
    formSet(editar, banca, function (val, field) {
      if (field == "comision" || field == "participacion" || field == "renta")
        return Math.abs(val * 100);
      if (val === false) return 0;
      else if (val === true) return 1;
      else return val;
    });

    socket.sendMessage(
      "usuario-grupos",
      {
        usuarioID: banca.usuarioID,
      },
      function (e, d) {
        grupos = d || [];
        updateGrupos();
      }
    );

    function updateGrupos() {
      var _papelera = papelera.prop("checked");
      grupos.sort(function (a, b) {
        if (a.papelera < b.papelera) return -1;
        else if (a.papelera > b.papelera) return 1;
        else {
          if (a.activa < b.activa) {
            return 1;
          } else if (a.activa > b.activa) {
            return -1;
          } else return a.taquillaID - b.taquillaID;
        }
      });

      $("#grupos-body").html(
        jsrender(
          $("#rd-grupo-row"),
          grupos.filter(function (a) {
            return _papelera == a.papelera;
          })
        )
      );

      var psw = $(".password");
      psw.on("mouseover", function (e) {
        $(e.target).html($(e.target).data("clave"));
      });
      psw.on("mouseout", function (e) {
        $(e.target).html("***");
      });

      var toggles = $(".toggle");
      toggles.each(function (index) {
        var me = $(this);
        me.toggles({
          text: {
            on: "SI",
            off: "NO",
          },
          on: me.data("activa"),
          click: true,
        });
      });
      $(".btgl").on("toggle", function (e, act) {
        var id = $(e.target).data("target");
        var banca = findBy("bancaID", id, grupos);
        socket.sendMessage(
          "banca-editar",
          {
            bancaID: banca.bancaID,
            activa: act,
          },
          function (e, d) {
            if (d.code == 1) {
              if (d.hasOwnProperty("activa")) banca.activa = d.activa;
            } else {
              alert("ERROR AL MODIFICAR ESTADO ACTIVO DE GRUPO");
            }
          }
        );
      });

      $(".bn-remove-req").click(function (e) {
        e.preventDefault(e);
        var bID = $(this).attr("bancaID");
        var r = confirm(
          "Seguro desea eliminar esta banca? Tenga en cuenta que enviara a la papelera todas las taquillas asociadas."
        );
        if (r === true) {
          socket.sendMessage(
            "banca-remover",
            {
              bancaID: bID,
              papelera: 1,
            },
            function (e, d) {
              if (d.code == 1) {
                var b = findBy("bancaID", bID, grupos);
                b.papelera = 1;
                updateGrupos();
              }
            }
          );
        }
        return false;
      });
      $(".bn-remove-res").click(function (e) {
        e.preventDefault(e);
        var bID = $(this).attr("bancaID");
        var r = confirm(
          "Seguro desea restaurar este grupo?  Tenga en cuenta que restaurara todas las taquillas asociadas."
        );
        if (r === true) {
          socket.sendMessage(
            "banca-remover",
            {
              bancaID: bID,
              papelera: 0,
            },
            function (e, d) {
              if (d.code == 1) {
                var b = findBy("bancaID", bID, grupos);
                b.papelera = 0;
                updateGrupos();
              }
            }
          );
        }
        return false;
      });
    }

    //comision
    var comisiones;
    var sorteo = $("#sorteo"),
      comForm = $("#com-form"),
      comBody = $("#com-tbody");
    sorteo.html(jsrender($("#rd-sorteos-option"), $sorteos));
    sorteo.select2("val", 0);
    sorteo.trigger("change");
    var hlp = copyTo(_helpers);
    hlp.sorteo = function (s) {
      return findBy("sorteoID", s, $sorteos).nombre;
    };
    comForm.submit(function (e) {
      e.preventDefault(e);
      var data = formControls(this);
      data.bancaID = banca.usuarioID;
      if (findBy("sorteo", data.sorteo, comisiones)) {
        notificacion(
          "VALOR DUPLICADO",
          "El sorteo que esta intentando modificar ya existe, remueva el valor existente y vuelva a intentarlo."
        );
        return;
      }
      socket.sendMessage("taquilla-comision-nv", data, function (e, d) {
        updateComision();
        //optimizar local
      });
    });

    function updateComision() {
      comBody.html("Cargando...");
      socket.sendMessage(
        "taquilla-comisiones",
        {
          bancaID: banca.usuarioID,
        },
        function (e, d) {
          comisiones = d || {};
          if (d) {
            comBody.html(jsrender($("#rd-com-row"), d || {}, hlp));
            $(".comDL").click(function (e) {
              e.preventDefault(e);
              var id = parseInt($(this).attr("comID"));
              socket.sendMessage(
                "taquilla-comision-dl",
                {
                  comID: id,
                },
                function (e, d) {
                  updateComision();
                  //optimizar local
                }
              );
            });
          } else comBody.html("");
        }
      );
    }
    updateComision();
  } else {
    nav.nav("406");
  }
}
nav.paginas.addListener("bancas/banca", bancasBanca_nav);

function bancasPermisos_nav(p, args) {
  var bancas_select = $("#bancas");
  var nuevoPermiso = $("#permisos");
  var tabla = $("#permisos-table");
  var _permisos;
  var lpermisos = [
    "PUBLICAR SORTEOS",
    "ACCEDER A TAQUILLAS",
    "ACTIVAR TAQUILLAS",
    "ACCEDER A TOPES",
    "TAQUILLAS ACTIVADAS",
    "TOPE GRUPO",
    "MODIFICAR TOPE BANCA",
  ];
  var hlp = {
    permiso: function (p) {
      return lpermisos[p - 1];
    },
  };

  function init() {
    bancas_select.on("change", buscar);
    var _bancas = $bancas.slice();
    _bancas.unshift({
      bancaID: 0,
      nombre: "TODAS",
    });
    bancas_select.html(jsrender($("#rd-usuario-option"), _bancas));

    nuevoPermiso.submit(function (e) {
      e.preventDefault(e);
      var data = formControls(this);
      if (data.hasOwnProperty("permisos")) {
        data.bancaID = 0;
        socket.sendMessage("permiso-nuevo", data, (e, d) => {
          if (d.error) notificacion(d.errorMsg);
          else buscar();
        });
      } else notificacion("SELECCIONE AL MENOS UN PERMISO", "", "growl-danger");
    });
  }
  init();

  function buscar() {
    tabla.html("");
    socket.sendMessage(
      "permisos",
      {
        usuarioID: bancas_select.select2("val"),
      },
      function (e, d) {
        _permisos = d || [];
        updateView();
      }
    );
  }

  function updateView() {
    $("#permisos-table").html(jsrender($("#rd-permiso-row"), _permisos, hlp));
    $(".permiso-remover").click(function (e) {
      e.preventDefault(e);
      var id = $(this).attr("metaID");
      socket.sendMessage(
        "permiso-remove",
        {
          meta: id,
        },
        function (e, d) {
          if (d > 0) {
            var idx = findIndex("metaID", id, _permisos);
            _permisos.splice(idx, 1);
            updateView();
            notificacion("PERMISO REMOVIDO EXITOSO", "", "growl-success");
          } else notificacion("ERROR AL REMOVER PERMISO", "", "growl-danger");
        }
      );
    });
    var toggles = $(".toggle");
    toggles.each(function (index) {
      var me = $(this);
      me.toggles({
        text: {
          on: "SI",
          off: "NO",
        },
        on: me.data("activa"),
        click: me.data("click"),
      });
    });
    toggles.on("toggle", function (e, act) {
      var id = $(e.target).data("target");
      socket.sendMessage(
        "permiso-update",
        {
          usuarioID: bancas_select.select2("val"),
          meta: id,
          valor: act,
        },
        function (e, d) {
          if (d > 0)
            notificacion("CAMBIO DE PERMISO EXITOSO", "", "growl-success");
          else notificacion("ERROR AL CAMBIAR PERMISO", "", "growl-danger");
        }
      );
    });
  }
}
nav.paginas.addListener("bancas/permisos", bancasPermisos_nav);

function bancasGrupo_nav(p, args) {
  if (args && args.length == 1) {
    var editar = $("#banca-nueva");
    var clave = $("#banca-psw");
    var renta = $("#banca-renta");
    var banca, taquillas;
    var multiplo = 0;

    var papelera = $("#papelera");
    papelera.change(function () {
      updateTaquillas();
    });

    editar.submit(function (e) {
      e.preventDefault(e);
      var data = formControls(this);
      data.bancaID = banca.bancaID;
      data.comision = data.comision / 100;
      if ($("#alquiler").is(":checked")) {
        data.comision = data.comision * -1;
      }
      formLock(this);
      socket.sendMessage("banca-editar", data, function (e, d) {
        formLock(editar[0], false);
        if (d.code == 1) {
          notificacion("Cambios guardados con exito");
          if (d.hasOwnProperty("activa")) banca.activa = d.activa;
          if (d.hasOwnProperty("nombre")) banca.nombre = d.nombre;
          if (d.hasOwnProperty("comision")) banca.comision = d.comision;
          if (d.hasOwnProperty("usuario")) banca.usuario = d.usuario;
        } else notificacion("Error al realizar cambios", "", "growl-danger");
      });
    });
    renta.submit(function (e) {
      e.preventDefault(e);
      var data = formControls(this);
      data.bancaID = banca.bancaID;
      data.renta = data.renta / 100;
      formLock(this);
      socket.sendMessage("banca-editar", data, function (e, d) {
        formLock(renta[0], false);
        if (d == 1) notificacion("Cambios guardados con exito");
        else notificacion("Error al realizar cambios", "", "growl-danger");
      });
    });
    clave.submit(function (e) {
      e.preventDefault(e);
      formLock(this);
      var data = formControls(this);
      data.bancaID = banca.bancaID;
      socket.sendMessage("banca-editar", data, function (e, d) {
        formReset(clave[0]);
        if (d.code == 1) {
          notificacion("Cambio de clave exitoso");
          if (d.hasOwnProperty("clave")) banca.clave = d.clave;
        } else notificacion("Cambio de clave fallido", "", "growl-danger");
      });
    });
    $(".rdo-com").change(function () {
      multiplo = this.value;
      $("#bn-comision").prop("disabled", this.value == 0);
    });

    socket.sendMessage(
      "banca-grupo",
      {
        bancaID: args[0],
      },
      function (e, d) {
        banca = d;
        formSet(editar, banca, function (val, field) {
          if (field == "comision") return Math.abs(val * 100);
          if (val === false) return 0;
          else if (val === true) return 1;
          else return val;
        });
        if (banca.comision < 0) $("#alquiler").prop("checked", 1);
        if (banca.comision == 0) $("#radioNormal").prop("checked", true);
        else if (banca.comision > 0) $("#radioRecogedor").trigger("click");
        else if (banca.comision < 0) $("#radioReventa").trigger("click");

        socket.sendMessage(
          "taquillas",
          {
            bancaID: banca.bancaID,
            usuarioID: banca.usuarioID,
          },
          function (e, d) {
            taquillas = d || [];
            updateTaquillas();
            updateComision();
          }
        );
      }
    );

    $("#taquilla-nueva").submit(function (e) {
      e.preventDefault(e);
      var data = formControls(this);
      data.bancaID = banca.bancaID;
      data.usuarioID = banca.usuarioID;
      var form = formLock(this);
      socket.sendMessage("taquilla-nueva", data, function (e, d) {
        if (d.hasOwnProperty("code")) {
          formLock(form, false);
          notificacion(
            "DISCULPE: USUARIO NO DISPONIBLE",
            "El usuario que esta asignando a la taquilla, ya esta en uso intente con uno distinto.",
            "growl-danger"
          );
        } else {
          formReset(form);
          data.taquillaID = d;
          data.papelera = 0;
          data.fingerlock = true;
          data.fingerprint = null;
          taquillas.push(data);
          updateTaquillas();
        }
      });
    });

    function updateTaquillas() {
      var _papelera = papelera.prop("checked");
      taquillas.sort(function (a, b) {
        if (a.papelera < b.papelera) return -1;
        else if (a.papelera > b.papelera) return 1;
        else {
          if (a.activa < b.activa) {
            return 1;
          } else if (a.activa > b.activa) {
            return -1;
          } else return a.taquillaID - b.taquillaID;
        }
      });

      $("#taquillas-body").html(
        jsrender(
          $("#rd-taquilla-row"),
          taquillas.filter(function (a) {
            return _papelera == a.papelera;
          })
        )
      );
      var psw = $(".password");
      psw.on("mouseover", function (e) {
        $(e.target).html($(e.target).data("clave"));
      });
      psw.on("mouseout", function (e) {
        $(e.target).html("***");
      });

      var toggles = $(".activart");
      toggles.each(function (index) {
        var me = $(this);
        me.toggles({
          text: {
            on: "SI",
            off: "NO",
          },
          on: me.data("activa"),
          click: 1,
        });
      });
      toggles.on("toggle", function (e, act) {
        var id = $(e.target).data("target");
        var taquilla = findBy("taquillaID", id, taquillas);
        socket.sendMessage(
          "taquilla-editar",
          {
            taquillaID: taquilla.taquillaID,
            activa: act,
          },
          function (e, d) {
            if (d === 1) taquilla.activa = act;
            else {
              alert("ERROR AL MODIFICAR ESTADO ACTIVO DE TAQUILLA");
            }
          }
        );
      });
      //fingerlock
      var fingerlock = $(".fingerlock");
      fingerlock.each(function (index) {
        var me = $(this);
        me.toggles({
          text: {
            on: "SI",
            off: "NO",
          },
          on: me.data("activa"),
          click: true,
        });
      });
      fingerlock.on("toggle", function (e, act) {
        var id = $(e.target).data("target");
        var taquilla = findBy("taquillaID", id, taquillas);
        socket.sendMessage(
          "taquilla-flock",
          {
            taquillaID: taquilla.taquillaID,
            usuarioID: taquilla.usuarioID,
            activa: act,
          },
          function (e, d) {
            if (d.ok === 1) taquilla.fingerlock = act;
            else {
              alert("ERROR AL MODIFICAR VALIDACION DE HUELLA");
            }
          }
        );
      });

      //fingerclear
      $(".fingerclear").click(function (e) {
        e.preventDefault(e);
        var b = $(e.currentTarget);
        var id = parseInt(b.attr("val"));
        socket.sendMessage(
          "taquilla-fpclear",
          {
            taquillaID: id,
            usuarioID: banca.usuarioID,
          },
          function (e, d) {
            if (d.ok === 1) {
              b.parent().html('<i class="fa fa-shield"></i>');
            } else {
              alert("ERROR AL MODIFICAR HUELLA DEL TAQUILLA");
            }
          }
        );
      });

      $(".bn-remove-req").click(function (e) {
        e.preventDefault(e);
        var tID = $(this).attr("taqID");
        var r = confirm("Seguro desea eliminar esta taquilla?");
        if (r === true) {
          socket.sendMessage(
            "taquilla-remover",
            {
              taquillaID: tID,
              papelera: 1,
            },
            function (e, d) {
              if (d.code == 1) {
                var taquilla = findBy("taquillaID", tID, taquillas);
                taquilla.papelera = 1;
                updateTaquillas();
              }
            }
          );
        }
        return false;
      });
      $(".bn-remove-res").click(function (e) {
        e.preventDefault(e);
        var tID = $(this).attr("taqID");
        socket.sendMessage(
          "taquilla-remover",
          {
            taquillaID: tID,
            papelera: 0,
          },
          function (e, d) {
            if (d.code == 1) {
              var taquilla = findBy("taquillaID", tID, taquillas);
              taquilla.papelera = 0;
              updateTaquillas();
            }
          }
        );
        return false;
      });
    }
    var remTaqI = $("#rem-taqinactivas");
    remTaqI.click(function () {
      var i = 0;
      var taqs = taquillas.exploreBy("activa", 0).exploreBy("papelera", 0);
      if (taqs.length == 0) return;
      remTaqI.prop("disabled", 1);
      var taq,
        cont = $("#rem-tqinc");

      var r = confirm("Confirma desea remover todas las taquillas inactivas?");
      if (r === true) removerTaquilla(taqs[i].taquillaID);

      function removerTaquilla(id) {
        cont.html(i + "/" + taqs.length);
        socket.sendMessage(
          "taquilla-remover",
          {
            taquillaID: id,
            papelera: 1,
          },
          function (e, d) {
            if (d.code == 1) {
              taq = findBy("taquillaID", id, taquillas);
              taq.papelera = 1;
              if (++i < taqs.length) removerTaquilla(taqs[i].taquillaID);
              else {
                updateTaquillas();
                cont.html("");
                remTaqI.prop("disabled", 0);
              }
            }
          }
        );
      }
    });

    //comision
    var comisiones;
    var sorteo = $("#sorteo"),
      comForm = $("#com-form"),
      comBody = $("#com-tbody");
    sorteo.html(jsrender($("#rd-sorteos-option"), $sorteos));
    sorteo.select2("val", 0);
    sorteo.trigger("change");
    var hlp = copyTo(_helpers);
    hlp.sorteo = function (s) {
      return findBy("sorteoID", s, $sorteos).nombre;
    };
    comForm.submit(function (e) {
      e.preventDefault(e);
      var data = formControls(this);
      data.grupoID = banca.bancaID;
      data.bancaID = banca.usuarioID;
      if (findBy("sorteo", data.sorteo, comisiones)) {
        notificacion(
          "VALOR DUPLICADO",
          "El sorteo que esta intentando modificar ya existe, remueva el valor existente y vuelva a intentarlo."
        );
        return;
      }
      socket.sendMessage("grupo-comision-nv", data, function (e, d) {
        updateComision();
        //optimizar local
      });
    });

    function updateComision() {
      comBody.html("Cargando...");
      socket.sendMessage(
        "taquilla-comisiones",
        {
          grupoID: banca.bancaID,
          bancaID: banca.usuarioID,
        },
        function (e, d) {
          comisiones = d || {};
          if (d) {
            comBody.html(jsrender($("#rd-com-row"), d || {}, hlp));
            $(".comDL").click(function (e) {
              e.preventDefault(e);
              var id = parseInt($(this).attr("comID"));
              console.log($usuario);
              socket.sendMessage(
                "taquilla-comision-dl",
                {
                  comID: id,
                  bancaID: banca.usuarioID,
                },
                function (e, d) {
                  updateComision();
                  //optimizar local
                }
              );
            });
          } else comBody.html("");
        }
      );
    }
  } else {
    nav.nav("406");
  }
}
nav.paginas.addListener("bancas/grupo", bancasGrupo_nav);

function bancasTaquilla_nav(p, args) {
  var taquilla;
  var rm = $("#remover");
  if (args && args.length == 1) {
    socket.sendMessage(
      "taquillas",
      {
        id: args[0],
      },
      function (e, d) {
        if (d) {
          taquilla = d[0];
          formSet($("#taquilla-nueva"), taquilla);
          updateComision();
        } else nav.nav("406");
      }
    );

    $("#taquilla-nueva").submit(function (e) {
      e.preventDefault(e);
      var data = formControls(this);
      data.taquillaID = taquilla.taquillaID;
      var f = formLock(this);
      socket.sendMessage("taquilla-editar", data, function (e, d) {
        formLock(f, false);
        if (d == 1) {
          notificacion(
            "TAQUILLA",
            "CAMBIOS REALIZADOS EXITOSAMENTE",
            "growl-success"
          );
          $taquillas = null;
        } else {
          notificacion("DISCULPE: USUARIO NO DISPONIBLE", "", "growl-danger");
        }
      });
    });
    $("#cambiar-clave").submit(function (e) {
      e.preventDefault(e);
      var data = formControls(this);
      data.taquillaID = taquilla.taquillaID;
      var f = formLock(this);
      socket.sendMessage("taquilla-editar", data, function (e, d) {
        formLock(f, false);
        if (d == 1) {
          notificacion("TAQUILLA", "CAMBIO DE CLAVE EXITOSO", "growl-success");
          $taquillas = null;
        } else {
          notificacion(
            "CAMPOS INVALIDOS",
            "<p>CAMBIO DE CLAVE FALLIDO</p>",
            "growl-danger"
          );
        }
      });
    });
    rm.click(function () {
      rm.prop("disabled", true);
      rm.html(
        '<i class="fa fa-spinner fa-spin"></i> ESPERE, ESTO PUEDE TOMAR UN MOMENTO...'
      );

      socket.sendMessage(
        "taquilla-remover",
        {
          taquillaID: taquilla.taquillaID,
          usuarioID: taquilla.usuarioID,
          papelera: 1,
        },
        function (e, d) {
          if ($taquillas && $taquillas.length > 0) {
            var i = findIndex("taquillaID", taquilla.taquillaID, $taquillas);
            $taquillas.splice(i, 1);
          }
          nav.back();
        }
      );
    });

    //comision
    var comisiones;
    var sorteo = $("#sorteo"),
      comForm = $("#com-form"),
      comBody = $("#com-tbody");
    sorteo.html(jsrender($("#rd-sorteos-option"), $sorteos));
    sorteo.select2("val", 0);
    sorteo.trigger("change");
    var hlp = copyTo(_helpers);
    hlp.sorteo = function (s) {
      return findBy("sorteoID", s, $sorteos).nombre;
    };
    comForm.submit(function (e) {
      e.preventDefault(e);
      var data = formControls(this);
      data.taquillaID = taquilla.taquillaID;
      if (findBy("sorteo", data.sorteo, comisiones)) {
        notificacion(
          "VALOR DUPLICADO",
          "El sorteo que esta intentando modificar ya existe, remueva el valor existente y vuelva a intentarlo."
        );
        return;
      }
      socket.sendMessage("taquilla-comision-nv", data, function (e, d) {
        updateComision();
        //optimizar local
      });
    });

    function updateComision() {
      comBody.html("Cargando...");
      socket.sendMessage(
        "taquilla-comisiones",
        {
          taquillaID: taquilla.taquillaID,
        },
        function (e, d) {
          comisiones = d || {};
          if (d) {
            comBody.html(jsrender($("#rd-com-row"), d || {}, hlp));
            $(".comDL").click(function (e) {
              e.preventDefault(e);
              var id = parseInt($(this).attr("comID"));
              socket.sendMessage(
                "taquilla-comision-dl",
                {
                  comID: id,
                },
                function (e, d) {
                  updateComision();
                  //optimizar local
                }
              );
            });
          } else comBody.html("");
        }
      );
    }
  }
}
nav.paginas.addListener("bancas/taquilla", bancasTaquilla_nav);

function bancasTransferir_nav(p, args) {
  var bancas = $(".bnc"),
    taqs = $("#taquilla"),
    grupos = $("#trf-grupo");
  bancas.html(jsrender($("#rd-usuario-option"), $bancas));

  var reportes = $("#sreporte");
  var dBanca = $("#desdebnc");
  dBanca.select2("val", "");

  dBanca.on("change", function (e) {
    var bncid = $(this).val();
    socket.sendMessage(
      "usuario-grupos",
      {
        usuarioID: bncid,
      },
      updateGrupos
    );
  });

  function updateGrupos(e, d) {
    grupos.html(jsrender($("#rd-grupo-option"), d));
    grupos.select2("val", 0);
  }

  $("#trf-grupo-form").submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    if (dBanca.val() == data.uID) {
      notificacion(
        "ASISTENTE",
        "La banca de origen debe ser diferente a la banca destino"
      );
    } else {
      socket.sendMessage("transferir-grupo", data, function (e, d) {
        if (d > 0) {
          var m = "- Grupo transferida con exito.";
          notificacion("TRANSFERENCIA EXITOSA", m);
        } else notificacion("TRANFERENCIA FALLIDA", "Comuniquese con el administrador");
      });
    }
  });

  function updateTaquillas(e, d) {
    taqs.html(jsrender($("#rd-taquilla-option"), d));
    taqs.select2("val", 0);
  }
  //socket.sendMessage("taquillas", {bancaID:bancas.val()}, updateTaquillas);

  $("#tranferir").submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    if (data.desde == data.hasta) {
      notificacion(
        "ASISTENTE",
        "La banca de origen debe ser diferente a la banca destino"
      );
    } else {
      socket.sendMessage(
        "transferir",
        {
          taq: data,
          vnt: reportes.is(":checked"),
        },
        function (e, d) {
          if (d > 0) {
            var m = "- Agencia transferida con exito.";
            if (d == 2) m += "</br>- Ventas y reportes transferidos con exito.";
            notificacion("TRANSFERENCIA EXITOSA", m);
          } else
            notificacion(
              "TRANFERENCIA FALLIDA",
              "Comuniquese con el administrador"
            );
        }
      );
    }
  });
}
nav.paginas.addListener("bancas/transferir", bancasTransferir_nav);

function topes_nav(p, args) {
  var sorteo = $("#sorteo"),
    taqs = $("#taquilla"),
    sorteos = $("#sorteos"),
    grupos = $("#grupos"),
    bancas = $("#bancas");
  var elemento = $("#elemento"),
    monto = $("#monto");
  var sfecha = $("#sorteo-fecha");

  var b = $bancas.slice();
  b.unshift({
    bancaID: 0,
    nombre: "",
  });
  bancas.html(jsrender($("#rd-usuario-option"), b));
  bancas.select2("val", "");
  bancas.on("change", function () {
    socket.sendMessage(
      "topes",
      {
        usuarioID: bancas.val(),
      },
      function (e, d) {
        dsp_topes(e, d);
        socket.sendMessage(
          "usuario-grupos",
          {
            usuarioID: bancas.val(),
          },
          function (e, d) {
            d = d || [];
            d.unshift({
              bancaID: 0,
              nombre: "TODOS",
            });
            grupos.html(jsrender($("#rd-banca-option"), d));
            grupos.select2("val", 0);
          }
        );
      }
    );
  });
  grupos.on("change", function () {
    var filtro = {
      usuarioID: bancas.val(),
    };
    if (grupos.val() > 0) filtro.bancaID = grupos.val();
    socket.sendMessage("topes", filtro, function (e, d) {
      dsp_topes(e, d);
      socket.sendMessage(
        "taquillas",
        {
          banca: bancas.val(),
        },
        function (e, d) {
          taqs.html(jsrender($("#rd-taquilla-option"), d));
        }
      );
    });
  });

  var srt = $sorteos.slice();
  srt.unshift({
    sorteoID: 0,
    nombre: "TODOS",
  });
  sorteo.html(jsrender($("#rd-sorteos-option"), srt));
  sorteo.on("change", function () {
    var v = sorteo.val();
    var elem = exploreBy("s", v, $elementos);
    elem.unshift({
      id: 0,
      d: "TODOS",
    });
    elemento.html(jsrender($("#rd-elemento-option"), elem));
    elemento.select2("val", 0);

    dsp_sorteos(sDia);
  });
  sorteo.select2("val", 0);
  sorteo.trigger("change");

  var help = {
    elm: function (n) {
      if (n == 0) return "TODAS";
      else {
        var e = findBy("id", n, $elementos);
        return e ? "#" + e.n + " " + e.d : "";
      }
    },
    srt: function (id) {
      if (id == 0) return "TODOS";
      else return '<a href="#sorteo|' + id + '">#' + padding(id, 5) + "</a>";
    },
  };
  var data;
  var sDia;

  function dsp_topes(e, d) {
    if (d.hasOwnProperty("message")) return notificacion(d.message);
    d.forEach(function (item) {
      if (item.sorteo > 0) {
        item.nsorteo = findBy("sorteoID", item.sorteo, $sorteos).nombre;
      }
    });
    $("#topes-body").html(jsrender($("#rd-topes-row"), d || [], help));
    $(".tope-rem").click(function (e) {
      e.preventDefault(e);
      if (confirm("Seguro desea remover tope?")) {
        var b = $(this);
        var data = {};
        data.topeID = parseInt(b.attr("topeID"));
        data.taquillaID = parseInt(b.attr("taquillaID"));
        data.bancaID = parseInt(b.attr("bancaID"));
        socket.sendMessage("tope-remover", data, function (e, t) {
          $("#tope" + data.topeID).remove();
        });
      }
    });
  }

  function dsp_sorteos(d) {
    if (!d) {
      $("#hlp-sorteos").html(
        "<i>No hay sorteos disponibles para este dia.</i>"
      );
      d = [];
    }
    d = d.filter(function (item) {
      return item.sorteo == sorteo.val();
    });
    d.unshift({
      sorteoID: 0,
      descripcion: "TODOS",
    });
    sorteos.html(jsrender($("#rd-sorteo-option"), d));
    sorteos.select2("val", 0);
    $("#hlp-sorteos").html("");
  }

  sfecha.change(function (e) {
    var _fecha = $(e.target).val();
    $("#hlp-sorteos").html(
      '<i class="fa fa-spinner fa-spin"></i> Espere, recibiendo sorteos...</i>'
    );
    socket.sendMessage(
      "sorteos",
      {
        fecha: _fecha,
      },
      function (e, d) {
        sDia = d || [];
        dsp_sorteos(sDia);
      }
    );
  });

  $("#tope-nuevo").submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    data.bancaID = grupos.val();
    data.usuarioID = bancas.val();
    var f = formLock(this);
    socket.sendMessage("tope-nuevo", data, function (e, d) {
      formLock(f, false);
      if (d.error) return notificacion(d.error);
      monto.val("");
      socket.sendMessage(
        "topes",
        {
          usuarioID: bancas.val(),
          bancaID: grupos.val(),
        },
        dsp_topes
      );
    });
  });
  sfecha.trigger("change");
}
nav.paginas.addListener("bancas/topes", topes_nav);
function topes2_nav(p, args) {
  const rd_grupo = $("#rd-banca-option");
  const rd_banca = $("#rd-usuario-option");
  const rd_operadora = $("#rd-sorteos-option");

  const topesBuscar_form = $("#topesBuscar_form");
  const buscarTopes = $("#md-buscar_ticket");
  const buscarTope_btn = $("#buscarTope_btn");
  const bancas_select = $("#bancas");
  const grupos_select = $("#grupos");
  const operadora_select = $("#operadoras");
  const numero_formGroup = $("#numero");
  let bancas;
  let grupos;
  let operadoras;
  function init() {
    buscarTope_btn.click(() => buscarTopes.modal("show"));
    //bancas
    bancas = [{ bancaID: 0, nombre: "TODAS" }, ...$bancas];
    bancas_select.html(jsrender(rd_banca, bancas));
    bancas_select.select2("val", "");
    bancas_select.on("change", function () {
      socket.sendMessage(
        "usuario-grupos",
        { usuarioID: bancas_select.val() },
        function (e, d) {
          grupos = [{ bancaID: 0, nombre: "TODOS" }, ...d];
          grupos_select.html(jsrender(rd_grupo, grupos));
          grupos_select.select2("val", 0);
        }
      );
    });
    //operadoras
    operadoras = [{ sorteoID: 0, nombre: "TODAS" }, ...$sorteos];
    operadora_select.html(jsrender(rd_operadora, operadoras));
    operadora_select.change((event) => {
      const show = parseInt(event.val) > 0;
      if (show) numero_formGroup.removeClass("hidden");
      else numero_formGroup.addClass("hidden");
    });
    //form
    topesBuscar_form.submit(function (e) {
      e.preventDefault(e);
      let data = formControls(this);
      console.log(data);
    });
  }
  init();
}
nav.paginas.addListener("bancas/topes2", topes2_nav);
/**
 * @param {String} pagina
 * @param {String[]} args
 */
function reporteGeneral_nav(pagina, args) {
  let params;
  var f1 = $("#reporte-fecha1");
  var f2 = $("#reporte-fecha2");
  var reporte_search;
  var reporte_form = $("#reporte");
  var grupo_select = $("#rp-agrupar");
  var formato = $("#formato");
  var reporte_result;
  var hlp = {
    bn: function () {
      return $usuario.nombre;
    },
  };

  function init() {
    reporte_form.submit(function (e) {
      e.preventDefault(e);
      reporte_search = formControls(this);
      if (params && (params.banca || params.grupo || params.taquilla)) {
        reporte_search.id = params.banca || params.grupo || params.taquilla;
        reporte_search.s = params.s;
      }
      let urlParam = toParams(reporte_search);
      nav.url(pagina, [urlParam]);
    });
    formato.change(prepareDownload);
  }
  init();

  function buscar(busqueda) {
    formLock(reporte);
    $("#pheader").html(jsrender($("#rd-prtaq"), busqueda, hlp));
    socket.sendMessage("reporte-general", busqueda, function (e, d) {
      formLock(reporte, false);
      reporte_result = d || [];
      updateView();
    });
  }

  function updateView() {
    if (reporte_result.length == 0) return;
    var j = 0,
      pr = 0,
      pg = 0,
      cm = 0,
      prt = 0,
      b = 0;
    reporte_result.forEach(function (item) {
      item.prt = item.prt ? item.prt : 0;
      item.balance = item.jg - item.pr - item.cm - item.prt;
      item.rango = f1[0].value + "|" + f2[0].value;
      b += item.balance;
      j += item.jg;
      pr += item.pr;
      cm += item.cm;
      prt += item.prt;
      item.url = toParams({
        inicio: f1.val(),
        fin: f2.val(),
        agrupar: grupo_select.val(),
        id: item.id,
      });
    });

    var total = {
      j: j.format(2),
      pr: pr.format(2),
      b: b.format(2),
      cm: cm.format(2),
      prt: prt.format(2),
    };
    $("#bheader").html(jsrender($("#rd-total"), total));

    $("#mnt-jugado").html(j.format(0));
    $("#mnt-premios").html(pr.format(0));
    $("#mnt-pagos").html(pg.format(0));
    $("#mnt-balance").html(b.format(0));

    $("#tg-descuento").html(cm.format(0));
    $("#tg-comision").html(cm.format(0));
    $("#tg-participacion").html(prt.format(0));
    $("#relacion-comision").html(((cm * 100) / j).format(2));
    $("#relacion-premios").html(((pr * 100) / j).format(2));
    $("#relacion-participacion").html(((prt * 100) / (j - pr - cm)).format(2));

    $("#reporte-body").html(jsrender($("#rd-reporte"), reporte_result));

    //prepareDownload();
  }

  function prepareDownload() {
    var a = document.getElementById("exportar");
    a.href = "#reporte/general";
    var name = (name =
      "SRQ - REPORTE " +
      reporte_search.inicio +
      "-" +
      reporte_search.fin +
      "." +
      formato.val());
    if (formato.val() == "json") {
      download(
        "exportar",
        JSON.stringify(reporte_result, null, 2),
        name,
        "text/plain"
      );
    } else if (formato.val() == "csv") {
      notificacion("FORMATO NO DISPONIBLE");
    } else {
      html2canvas($("#print-img"), {
        onrendered: function (canvas) {
          var myImage = canvas.toDataURL("image/png");
          a.href = myImage;
          a.download = name;
        },
      });
    }
  }

  if (args && args.length == 1) {
    params = fromParams(args[0]);
    if (params.s) $("#usuarioNombre").html(params.s);
    var inicio = params.inicio.split("-");
    var fin = params.fin.split("-");
    f1.datepicker(
      "setDate",
      new Date(inicio[0], parseInt(inicio[1]) - 1, inicio[2])
    );
    f2.datepicker("setDate", new Date(fin[0], parseInt(fin[1]) - 1, fin[2]));

    if (pagina.indexOf("reporte/banca") > -1) {
      params.banca = params.id;
      delete params.id;
    } else if (pagina.indexOf("reporte/grupo") > -1) {
      params.grupo = params.id;
      delete params.id;
    } else if (pagina.indexOf("reporte/taquilla") > -1) {
      params.taquilla = params.id;
      delete params.id;
    }
    buscar(params);
  }
}
nav.paginas.addListener("reporte/general", reporteGeneral_nav);

nav.paginas.addListener("reporte/banca", reporteGeneral_nav);

nav.paginas.addListener("reporte/grupo", reporteGeneral_nav);

function reporteTaquilla_nav(p, args) {
  var f1 = $("#reporte-fecha1");
  var f2 = $("#reporte-fecha2");
  var reporte = $("#reporte");
  var premios = $("#prm-select");
  var hbtaq = $("#hb-taquilla");
  var rpt;

  var bancas = $("#bancas");
  var grupos = $("#grupos");
  bancas.html(jsrender($("#rd-usuario-option"), $bancas));
  bancas.change(function () {
    hbtaq.html(
      '<i class="fa fa-spinner fa-spin" ></i> Espere, recibiendo grupos...'
    );
    socket.sendMessage(
      "usuario-grupos",
      {
        usuarioID: bancas.val(),
      },
      function (e, d) {
        $("#grupos").html(jsrender($("#rd-banca-option"), d));
        hbtaq.remove();
      }
    );
  });
  bancas.select2("val", "");

  grupos.change(function () {
    hbtaq.html(
      '<i class="fa fa-spinner fa-spin" ></i> Espere, recibiendo grupos...'
    );
    var b = bancas.val();
    socket.sendMessage(
      "taquillas",
      {
        usuarioID: b,
      },
      function (e, d) {
        $("#taquillas").html(jsrender($("#rd-taquilla-option"), d));
        hbtaq.remove();
      }
    );
  });

  reporte.submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    var f = formLock(this);
    socket.sendMessage("reporte-taquilla", data, function (e, d) {
      formLock(f, false);
      d = d || [];
      rpt = d;
      var j = 0,
        pg = 0,
        pr = 0,
        cm = 0;
      d.forEach(function (item) {
        item.balance = item.jugada - item.premio;
        j += item.jugada;
        pg += item.pago;
        pr += item.premio;
        cm += item.comision;
      });

      $("#mnt-jugado").html(j.format(2));
      $("#mnt-premios").html(pr.format(2));
      $("#mnt-pagos").html(pg.format(2));
      $("#mnt-balance").html((j - pr - cm).format(2));

      $("#tg-descuento").html(cm.format(2));
      $("#tg-comision").html(cm.format(2));

      var rank, bnc;
      //top jugado
      rank = d.slice();
      rank.sort(function (a, b) {
        return b.jugada - a.jugada;
      });
      bnc = rank[0];
      $("#tj-banca").html(bnc.descripcion);
      $("#tj-jugada").html(bnc.jugada.format(2));
      $("#tj-balance").html(bnc.balance.format(2));

      //top ganancia
      rank = d.slice();
      rank.sort(function (a, b) {
        return b.balance - a.balance;
      });
      bnc = rank[0];
      $("#tg-banca").html(bnc.descripcion);
      $("#tg-jugada").html(bnc.jugada.format(2));
      $("#tg-balance").html(bnc.balance.format(2));

      updateView();
    });
  });
  premios.change(updateView);

  function updateView() {
    $("#reporte-body").html(jsrender($("#rd-reporte"), rpt));
  }

  if (args && args.length > 0) {
    var a = args[0].split("-");
    var b = args[1].split("-");
    f1.datepicker("setDate", new Date(a[0], parseInt(a[1]) - 1, a[2]));
    f2.datepicker("setDate", new Date(b[0], parseInt(b[1]) - 1, b[2]));
  }
}
nav.paginas.addListener("reporte/taquilla", reporteGeneral_nav);

function reporteVentas_nav(p, args) {
  var bancas = $("#bancas");
  var hbtaq = $("#hb-taquilla");
  var taqs = $("#taquillas");
  const s2_taquillas = $("#rd-taquillal-option");
  socket.addListener("taquillas", updateTaquillas);

  bancas.html(jsrender($("#rd-usuario-option"), $bancas));
  bancas.select2("val", null);
  bancas.on("change", function () {
    taqs.select2("val", null);
    hbtaq.html(
      '<i class="fa fa-spinner fa-spin"></i> Espere, recibiendo taquillas..'
    );
    socket.sendMessage(
      "sql",
      {
        comando: "fdd29ed26e0da352612bdc8ca918226d",
        data: { usuario: bancas.val() },
      },
      updateTaquillas
    );
  });

  function updateTaquillas(e, d) {
    hbtaq.html("");
    d = d || [];
    d.data = d.data.sort((a, b) => {
      a.nombre = a.nombre.toLowerCase();
      b.nombre = b.nombre.toLowerCase();
      if (a.nombre > b.nombre) return 1;
      else if (a.nombre < b.nombre) return -1;
      else return 0;
    });
    const html = jsrender(s2_taquillas, d.data);
    taqs.html(html);
  }

  var rpt;
  var j = 0,
    pg = 0,
    pr = 0,
    an = 0,
    anm = 0;

  var rf = $("#reporte-fecha");
  var body = $("#reporte-body");
  var nav = $("#nav-table");
  var all = [];

  $("#rpt-vpremio").click(function () {
    var d = all.filter(function (item) {
      return item.pr > 0;
    });
    updateBody(d);
    $(".nav-btn").addClass("disabled");
  });
  $("#rpt-vjugado").click(function () {
    updateBody(rpt[cindex]);
    $(".nav-btn").removeClass("disabled");
  });
  $("#rpt-vanulado").click(function () {
    var d = all.filter(function (item) {
      return item.a > 0;
    });
    updateBody(d);
    $(".nav-btn").addClass("disabled");
  });
  $("#rpt-vpend").click(function () {
    var d = all.filter(function (item) {
      return item.pg < item.pr;
    });
    updateBody(d);
    $(".nav-btn").addClass("disabled");
  });
  $("#rpt-vpagos").click(function () {
    var d = all.filter(function (item) {
      return item.pg > 0;
    });
    updateBody(d);
    $(".nav-btn").addClass("disabled");
  });

  $("#reporte").submit(function (e) {
    e.preventDefault(e);
    all.length = 0;
    j = 0;
    pg = 0;
    pr = 0;
    an = 0;
    anm = 0;

    var data = formControls(this);
    var f = formLock(this);
    resetForm();
    socket.sendMessage("reporte-ventas", data, function (e, d) {
      formLock(f, false);
      if (!d.last) socket.addListener("reporte-ventas", prefetch);
      all = all.concat(d.data);
      if (d.data) {
        rpt = [d.data];
        updateTotal(d.data);
        updateBody(d.data);
        nav.html('<button class="btn btn-primary nav-btn">1</button>');
      }
    });
  });

  function resetForm() {
    body.html("");
    nav.html("");
    $(".es-reset").html("--");
    nindex = 1;
    cindex = 0;
  }
  var nindex = 1,
    cindex = 0;

  function prefetch(e, d) {
    if (d.data) {
      rpt.push(d.data);
      all = all.concat(d.data);
      updateTotal(d.data);
      nav.append(
        '<button class="btn btn-default nav-btn">' + ++nindex + "</button>"
      );
    }
    if (d.last) {
      socket.removeListener("reporte-ventas", prefetch);
      $(".nav-btn").click(function () {
        var b = $(this);
        cindex = parseInt(b.html()) - 1;
        if (b.hasClass("btn-default")) {
          $(".nav-btn").switchClass("btn-primary", "btn-default");
          b.switchClass("btn-default", "btn-primary");
          updateBody(rpt[cindex]);
        }
      });
    }
  }

  function updateBody(d) {
    body.html(jsrender($("#rd-reporte-diario"), d));
    $(".fticket").click(function () {
      var md = $("#md-ticket");
      var val = $(this).data("id");
      md.on("shown.bs.modal", function (e) {
        md.off("shown.bs.modal", arguments.callee);
        var input = $("#md-pagar-ticket");
        input.val(parseInt(val));
        input.focus();
      });
      md.modal("show");
    });
  }

  function updateTotal(d) {
    if (!d) return;
    d.forEach(function (item) {
      if (item.a == 0) {
        j += item.m;
        pg += item.pg;
        pr += item.pr;
      } else {
        an++;
        anm += item.m;
      }
    });

    $("#mnt-jugado").html(j.format(2));
    $("#mnt-premios").html(pr.format(2));
    $("#mnt-pagos").html(pg.format(2));
    $("#mnt-balance").html((j - pr).format(2));

    $("#mnt-pendiente").html((pr - pg).format(2));
    $("#mnt-ppagos").html(((pg / pr) * 100).format(2));
    $("#mnt-tanulados").html(an.format(2));
    $("#mnt-anulados").html(anm.format(2));
  }

  $("#print-reporte").click(function () {
    var now = new Date();

    var _lineas = [
      {
        type: "linea",
        text: $usuario.nombre,
        align: "center",
      },
      {
        type: "linea",
        text: now.format("yy-mm-dd") + " " + now.format("TZ:240 h:MM:s TT"),
        align: "center",
      },
      {
        type: "linea",
        text: "REPORTE TICKETS",
        align: "center",
      },
    ];

    _lineas.push({
      type: "linea",
      text: "JUGADO: " + j.format(2),
      align: "left",
    });
    _lineas.push({
      type: "linea",
      text: "PREMIOS: " + pr.format(2),
      align: "left",
    });
    _lineas.push({
      type: "linea",
      text: "PAGOS: " + pg.format(2),
      align: "left",
    });
    _lineas.push({
      type: "linea",
      text: "PENDIENTE: " + (pr - pg).format(2),
      align: "left",
    });
    _lineas.push({
      type: "linea",
      text: "BALANCE: " + (j - pg).format(2),
      align: "left",
    });
    _lineas.push({
      type: "linea",
      text: " ",
      align: "left",
    });

    print.sendMessage("print", {
      data: _lineas,
      printer: 1,
    });
  });

  if (args && args.length >= 1) {
    var a = args[0].split("-");
    rf.datepicker("setDate", new Date(a[0], parseInt(a[1]) - 1, a[2]));
    //$('#reporte').trigger("submit");
  }
}
nav.paginas.addListener("reporte/ventas", reporteVentas_nav);

function reporteCobros_nav(p, args) {
  var f1 = $("#reporte-fecha1");
  var f2 = $("#reporte-fecha2");
  var reporte = $("#reporte");
  var rdata;
  _helpers.rgFiltro = function () {
    return f1.val() && f2.val() ? "|" + f1.val() + "|" + f2.val() : "";
  };
  reporte.submit(function (e) {
    e.preventDefault(e);
    var lazy = [];
    var data = formControls(this);
    var f = formLock(this);
    var grp = $("#rp-agrupar").val();
    socket.sendMessage(
      "reporte-cobros",
      {
        s: data,
        g: grp,
      },
      function (e, d) {
        formLock(f, false);
        if (!d) {
          $("#reporte-body").html("");
          $(".clr").html("--");
          return;
        }
        rdata = d;
        var j = 0,
          cm = 0,
          pt = 0;
        d.forEach(function (item) {
          j += item.jg;
          cm += item.jg * item.cm;

          if (
            item.hasOwnProperty("cm") &&
            (item.cm == 0 || item.cm == null) &&
            item.hasOwnProperty("uID")
          ) {
            lazy.push(item.uID);
          }
        });
        lazyLoad();
        $("#mnt-jugado").html(j.format(2));

        var rank, bnc;
        //top jugado
        rank = d.slice();
        rank.sort(function (a, b) {
          return b.jg - a.jg;
        });
        bnc = rank[0];
        $("#tj-banca").html(bnc.desc);

        $("#tj-jugada").html(bnc.jg.format(2));
        $("#recaudo").html(cm.format(2));
        $("#trenta").html((j * $usuario.comision).format(2));

        $("#reporte-body").html(jsrender($("#rd-reporte"), d));
        $(".cbr-bal").on("click", cbrbal_click);

        $(".cbr-folder").click(function (e) {
          e.preventDefault(e);
          var o = parseInt($(this).attr("fld"));
          $(this).attr("fld", o == 1 ? 0 : 1);
          var fld = parseInt($(this).attr("fldid"));
          if (o == 0) {
            $(".subrow" + fld).removeClass("hidden");
            $(this).find("i").addClass("fa-folder-open");
          } else {
            $(".subrow" + fld).addClass("hidden");
            $(this).find("i").removeClass("fa-folder-open");
          }
        });

        function lazyLoad() {
          if (lazy.length > 0) {
            var id = lazy.shift();
            var gdata = copyTo(data);
            gdata.uid = id;
            socket.sendMessage(
              "reporte-subcobros",
              {
                s: gdata,
                g: 3,
              },
              function (e, dgr) {
                var cm2 = 0;
                dgr.forEach(function (sitem) {
                  sitem.uID = id;
                  cm2 += sitem.jg * sitem.cm;
                });
                cm += cm2;
                $("#rnt" + id).html(cm2.format(2));

                $("#recaudo").html(cm.format(2));
                $("#trenta").html((j * $usuario.comision).format(2));

                var b = jsrender($("#rd-reporte"), dgr);
                $(b).insertAfter("#rdu" + id);

                $(".cbr-shutdown").off("click");
                $(".cbr-shutdown").click(function (e) {
                  e.preventDefault(e);
                  var id;
                  if ($(this).attr("banca")) {
                    id = parseInt($(this).attr("banca"));
                    var us = findBy("uID", id, d);
                    var c = confirm(
                      "SEGURO DESEA SUSPENDER USUARIO " + us.desc
                    );
                    if (c) {
                      socket.sendMessage(
                        "usuario-editar",
                        {
                          usuarioID: id,
                          activo: 0,
                        },
                        function (e, d) {
                          if (d.code == 1) {
                            if (d.hasOwnProperty("activa"))
                              banca.activo = d.activo;
                            notificacion("USUARIO SUSPENDIDO CON EXITO");
                          }
                        }
                      );
                    }
                  }
                });
                $("#cbrfi" + id).switchClass("fa-folder-o", "fa-folder");

                $(".cbr-bal").off("click");
                $(".cbr-bal").on("click", cbrbal_click);

                lazyLoad();
              }
            );
          }
        }
      }
    );
  });

  function cbrbal_click(ev) {
    ev.preventDefault(ev);
    var id = $(this).attr("usID");
    var m = parseFloat($(this).attr("monto"));
    var d =
      "COBRO SRQ SEMANA" +
      f1.val() +
      "|" +
      f2.val() +
      " " +
      $(this).attr("desc");
    socket.sendMessage(
      "balance-add",
      {
        usID: id,
        monto: m,
        desc: d,
        cdo: 1,
      },
      function (e, d) {
        $("#rd" + d.usID).addClass("success");
        $(ev.target.parentElement).remove();
      }
    );
  }

  $("#rtp-desc-o").click(function (e) {
    e.preventDefault(e);
    rdata.sort(function (a, b) {
      var ret = 0;
      a = a.desc.toLowerCase();
      b = b.desc.toLowerCase();
      if (a > b) ret = 1;
      if (a < b) ret = -1;
      return ret;
    });
    $("#reporte-body").html(jsrender($("#rd-reporte"), rdata));
  });
  $("#cbr-procesar").click(function () {
    $(this).prop("disabled", 1);
    var lz = [];
    $(".cbr-bal").each(function (idx, item) {
      lz.push(item);
    });
    lzLoad(lz.shift());

    function lzLoad(item) {
      var id = $(item).attr("usID");
      var m = parseFloat($(item).attr("monto"));
      var min = parseFloat($("#minValor").val());
      var descripcion =
        "COBRO SRQ " + f1.val() + "|" + f2.val() + ", " + $(item).attr("desc");
      if (m < min) {
        m = min;
        descripcion =
          "COBRO SRQ " +
          f1.val() +
          "|" +
          f2.val() +
          ", " +
          $(item).attr("desc") +
          " *RENTA BASICA*";
      }
      //descuento
      var descuento = parseFloat($("#descuento").val());
      if (descuento > 0) {
        descripcion =
          "COBRO SRQ " +
          f1.val() +
          "|" +
          f2.val() +
          ", " +
          $(item).attr("desc") +
          " *TOTAL: " +
          m.toFixed(2) +
          " -" +
          descuento +
          "% DESCUENTO*";
        m = m - (m * descuento) / 100;
      }

      socket.sendMessage(
        "balance-add",
        {
          usID: id,
          monto: m,
          desc: descripcion,
          cdo: 1,
        },
        function (e, d) {
          $("#rd" + d.usID).addClass("success");
          if (lz.length > 0) lzLoad(lz.shift());
          else $("#cbr-procesar").prop("disabled", 0);
        }
      );
    }
  });
  if (args && args.length > 0) {
    var a = args[0].split("-");
    var b = args[1].split("-");
    f1.datepicker("setDate", new Date(a[0], parseInt(a[1]) - 1, a[2]));
    f2.datepicker("setDate", new Date(b[0], parseInt(b[1]) - 1, b[2]));
    reporte.trigger("submit");
  }
}
nav.paginas.addListener("reporte/cobros", reporteCobros_nav);

function reporteBalance_nav(p, args) {
  var user,
    usData = [];

  function updateBalance() {
    if ($balance != null) {
      $("#reporte-body").html(jsrender($("#rd-reporte-us"), $balance));
      for (var i = 0; i < $balance.length; i++) {
        if ($balance[i].c == 1) {
          $("#bl-my-total").html($balance[i].balance.format(2));
          break;
        }
      }
      $(".bl-pagar").click(balance_pago_click);
    } else {
      $("#reporte-body").html(jsrender($("#rd-reporte-us"), []));
    }
  }
  if (args && args.length > 0) {
    $(".bl-dreg").each(function () {
      $(this).removeClass("hidden");
    });
    $(".bl-greg").each(function () {
      $(this).addClass("hidden");
    });
    $("#bl-my").addClass("hidden");
    socket.sendMessage(
      "balance-us",
      {
        usID: args[0],
      },
      function (e, d) {
        if (d.hasOwnProperty("code")) {
          user = {
            usID: args[0],
          };
        } else {
          usData = d.bl || [];
          usData.forEach((bl) => (bl.cliente = 1));
          user = d.us;
          $("#bl-us-name").html(d.us.nombre);
          $("#reporte-body-client").html(jsrender($("#rd-reporte-us"), d.bl));
          $("#bl-clients-total").html(d.bl[0].balance.format(2));
          $("#bl-client-heading").trigger("click");
          $(".bl-pagar").click(balance_pago_click);
        }
      }
    );
  } else {
    $(".bl-dreg").addClass("hidden");
    $(".bl-greg").removeClass("hidden");
    $("#bl-my").removeClass("hidden");

    var reporte;
    var oreporte;
    updateBalance();
    getBalanceClientes();

    $("#bl-sort-desc").click(function (e) {
      e.preventDefault(e);
      var ord = parseInt($(this).attr("ord"));
      ord = ord == 0 ? -1 : ord;
      $(this).attr("ord", ord * -1);
      reporte.sort(function (a, b) {
        return a.desc.toLowerCase() < b.desc.toLowerCase() ? ord : ord * -1;
      });
      $("#reporte-body-client").html(jsrender($("#rd-reporte"), reporte));
    });
    $("#bl-sort-monto").click(function (e) {
      e.preventDefault(e);
      var ord = parseInt($(this).attr("ord"));
      ord = ord == 0 ? -1 : ord;
      $(this).attr("ord", ord * -1);
      reporte.sort(function (a, b) {
        return a.balance < b.balance ? ord : ord * -1;
      });
      $("#reporte-body-client").html(jsrender($("#rd-reporte"), reporte));
    });

    function reporte_pagos(inicio, fin) {
      socket.sendMessage(
        "balance-pagos",
        {
          inicio: inicio,
          fin: fin,
        },
        function (e, d) {
          d = d || [];
          $("#bl-pagos").html(jsrender($("#rd-reporte-pagos"), d));
          var total = 0;
          d.forEach(function (item) {
            total += item.monto;
          });
          $("#bl-pagos-total").html(total.format(2));

          reporte_ppagos();
        }
      );
    }

    function reporte_ppagos() {
      socket.sendMessage("balance-ppagos", null, function (e, balPend) {
        balPend = balPend || [];
        $("#bl-ppagos").html(jsrender($("#rd-reporte-pend"), balPend));
        var total = 0;
        balPend.forEach(function (item) {
          total += item.monto;
        });
        $("#bl-ppagos-total").html(total.format(2));

        $(".cf-pago").click(function (e) {
          e.preventDefault(e);
          var id = $(this).attr("bid");
          var pago = findBy("balID", id, balPend);
          askme(
            "CONFIRMAR PAGO #" + pago.balID,
            jsrender($("#rd-procesar-pendiente"), pago),
            {
              ok: function (data) {
                $("#cf-label").html("Espere.. confirmando pago.");
                var b = findBy("balID", id, balPend);
                var data = {
                  bID: id,
                  usID: b.usID,
                  monto: data.monto,
                  cdo: data.cdo,
                };
                socket.sendMessage("balance-confirmacion", data, function (
                  e,
                  d
                ) {
                  $("#md-ask").modal("hide");
                  $("#cfpago" + id);
                  getBalanceClientes();

                  //nav.url("reporte/balance",[b.usID]);
                });
                return false;
              },
            }
          );
        });
      });
    }

    //suspender toggle
    var toggles = $(".toggle");
    toggles.each(function (index) {
      var me = $(this);
      me.toggles({
        text: {
          on: "SI",
          off: "NO",
        },
        on: $config.balance.filtrar,
        click: true,
      });
    });
    toggles.on("toggle", function (e, act) {
      $config.balance.filtrar = act;
      saveConfig();
      updateView();
    });

    function filtrarSuspendidos(item) {
      if (item.usID.charAt(0) == "u") return item.activo == 3;
      else return item.activo == 1;
    }

    function updateView() {
      if (reporte == null) return;
      if ($config.balance.filtrar)
        reporte = oreporte.filter(filtrarSuspendidos);
      else reporte = oreporte;

      $("#reporte-body-client").html(jsrender($("#rd-reporte"), reporte));
      var tc = 0;
      reporte.forEach(function (item) {
        tc = tc + item.balance;
      });
      $("#bl-clients-total").html(tc.format(2));
      //$('#bl-client-heading').trigger('click');

      var now = new Date();
      var fin = now.format();
      now.setTime(now.getTime() - 86000000 * 7);
      var inicio = now.format();
      reporte_pagos(inicio, fin);
      $("#desde").val(inicio);
      $("#hasta").val(fin);

      //suspender
      $(".bl-suspender").click(suspenderHandler);
      //menu
      $(".bl-usmenu").click(function (e) {
        e.preventDefault(e);
        var usID = $(this).attr("usID");
        var tipo = usID[0];
        var uID = usID.substr(1);
        var u = findBy("usID", usID, reporte);
        var activo = u.activo;
        let n = notificacion(
          `ACCIONES: ${u.desc.toUpperCase()}`,
          jsrender($("#rd-blmenu"), {
            usID,
            tipo,
            uID,
            activo,
          })
        );
        $(
          `#gritter-item-${n} > div.gritter-item > div.gritter-without-image > p > a`
        ).click(function (e) {
          if ($(this).hasClass("bl-suspender")) {
            suspenderHandler(e);
          }
          let gritter = $(this).closest(".gritter-item-wrapper");
          gritter.remove();
        });
      });
    }

    function suspenderHandler(event) {
      event.preventDefault(event);
      var usID = $(event.currentTarget).attr("usID");
      var tipo = usID[0];
      var ID = usID.substr(1);
      var cf = confirm("Confirma desea suspender/restaurar usuario?");
      if (cf) {
        $("#bl-us" + usID).html('<i class="fa fa-spinner fa-spin"></i>');
        var act;
        if (tipo == "g") {
          act = parseInt($(event.currentTarget).attr("usAc")) == 0 ? 1 : 0;
          socket.sendMessage(
            "banca-editar",
            {
              bancaID: ID,
              activa: act,
            },
            (e, d) => {
              removeGritter(event.currentTarget);
              var u = findBy("usID", usID, reporte);
              if (d.code == 1) {
                u.activo = act;
                updateView();
              } else
                notificacion(
                  "ERROR",
                  "OCURRIO UN ERROR AL SUSPENDER A " + u.nombre
                );
            }
          );
        } else if (tipo == "u") {
          act = parseInt($(event.currentTarget).attr("usAc")) == 0 ? 3 : 0;
          socket.sendMessage(
            "usuario-editar",
            {
              usuarioID: ID,
              activo: act,
            },
            (e, d) => {
              removeGritter(event.currentTarget);
              var u = findBy("usID", usID, reporte);
              if (d.code == 1) {
                u.activo = act;
                updateView();
              } else
                notificacion(
                  "ERROR",
                  "OCURRIO UN ERROR AL SUSPENDER A " + u.nombre
                );
            }
          );
        }
      }
    }

    function getBalanceClientes() {
      socket.sendMessage("balance-clientes", null, function (e, d) {
        oreporte = d || [];
        reporte = oreporte.filter(filtrarSuspendidos);
        updateView();
      });
    }
  }
  $("#bl-remover-registro").click(function () {
    askme(
      "REMOVER REGISTRO",
      "Esta opcion le permite borrar el ultimo registro del balance, desea continuar?",
      {
        ok: function (r) {
          socket.sendMessage(
            "balance-remover",
            {
              usID: user.usID,
            },
            function (e, d) {
              usData.shift();
              $("#reporte-body-client").html(
                jsrender($("#rd-reporte-us"), usData)
              );
              if (usData.length > 0)
                $("#bl-clients-total").html(d.bl[0].balance.format(2));
              else $("#bl-clients-total").html("0.00");
            }
          );
          return true;
        },
      }
    );
  });
  $("#bl-nuevo-registro").click(function () {
    askme("NUEVO REGISTRO", jsrender($("#rd-balance-nuevo")), {
      ok: function (result) {
        balance_add(result.desc, result.monto, user.usID);
      },
    });
  });
  $("#bl-fpagos").submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    reporte_pagos(data.inicio, data.fin);
  });

  function balance_pago_click(e) {
    e.preventDefault(e);
    var pago = $(this).attr("pago");
    var esCliente = $(this).attr("cliente");
    if (esCliente === "1") cliente(pago);
    else usuario(pago);

    function cliente(pago) {
      var balance = findBy(
        "balID",
        pago,
        args && args.length > 0 ? usData : $balance
      );
      //data.cliente = cliente;
      askme(
        "PROCESAR PAGO #" + pago,
        jsrender($("#rd-procesar-pago"), balance),
        {
          ok: function (result) {
            var monto = parseFloat(result.monto) * -1;
            balance_add(
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
              monto,
              user.usID,
              1
            );
            return true;
          },
        }
      );
    }

    function usuario(pago) {
      var balance = findBy(
        "balID",
        pago,
        args && args.length > 0 ? usData : $balance
      );
      //data.cliente = cliente;
      askme(
        "PROCESAR PAGO #" + pago,
        jsrender($("#rd-procesar-pago"), balance),
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
              usID: balance.usID,
              resID: balance.resID,
            };
            socket.sendMessage("balance-pago", data, function (e, d) {
              d.balance = "--";
              d.c = 0;
              $balance.unshift(d);
              updateBalance();
              notificacion("PAGO ENVIADO EXITOSAMENTE");
            });
            return true;
          },
        }
      );
    }
  }

  function balance_add(descripcion, monto, usuario, confirmar) {
    var data = {
      desc: descripcion,
      monto: monto,
      usID: usuario,
      cdo: confirmar || 1,
    };
    socket.sendMessage("balance-add", data, function (e, d) {
      if (usData.length > 0) {
        d.balance = d.monto + usData[0].balance;
      } else {
        d.balance = d.monto;
      }
      d.c = d.cdo;
      usData.unshift(d);
      $("#reporte-body-client").html(jsrender($("#rd-reporte-us"), usData));
      $("#bl-clients-total").html(d.balance.format(2));
      $(".bl-pagar").click(balance_pago_click);
    });
  }

  function removeGritter(target) {
    let gritter = $(target).closest(".gritter-item-wrapper");
    gritter.remove();
  }
}
nav.paginas.addListener("reporte/balance", reporteBalance_nav);

/* MENSAJES */
function mensajes_nav(p, args) {
  let mensajes = $mensajes.slice(0, 10);
  $("#ms-totalConversaciones").html($mensajes.length);
  $("#sms-bandeja").html(jsrender($("#rd-sms"), mensajes));
}
nav.paginas.addListener("mensajes", mensajes_nav);

function smsNuevo_nav(p, args) {
  let destinos = $("#destino");
  socket.sendMessage("chat-destinos", null, (e, d) => {
    destinos.html(jsrender($("#rd-destino-option"), d || []));
  });

  $("#sms-form").submit(function (e) {
    e.preventDefault(e);
    let data = formControls(this);
    socket.sendMessage("chat-nuevo", data, (e, d) => {
      notificacion("Mensaje enviado");
    });
  });
}
nav.paginas.addListener("mensaje/nuevo", smsNuevo_nav);

function mensajesRecibidos_nav(p, args) {
  socket.sendMessage("chat-recibidos", null, (e, d) => {
    $("#ms-totalConversaciones").html(d.length);
    $("#sms-bandeja").html(jsrender($("#rd-sms"), d));
  });
}
nav.paginas.addListener("mensaje/recibidos", mensajesRecibidos_nav);

function mensajesEnviados_nav(p, args) {
  socket.sendMessage("chat-enviados", null, (e, d) => {
    $("#ms-totalConversaciones").html(d.length);
    $("#sms-bandeja").html(jsrender($("#rd-sms"), d));
  });
}
nav.paginas.addListener("mensaje/enviados", mensajesEnviados_nav);

function mensajesLeer_nav(p, args) {
  var mensajes = [];
  var origen;
  var msgHelp = {
    recibido: function (destino) {
      return $usuario.usID == destino ? "col-xs-offset-3 alert-success" : "";
    },
    fecha: function fechaHelper(fecha) {
      let f = fecha.split(" ");
      let now = dateFormat(null, "dd/mm/yy");
      if (now == f[0]) f.shift();
      return f.join(" ");
    },
    markdown: function markdownHelper(contenido) {
      let r = /\*([\w\S]+)\*/,
        m;
      while ((m = r.exec(contenido)))
        contenido = contenido.replace(m[0], `<strong>${m[1]}</strong>`);
      return contenido;
    },
  };
  if (args.length > 0) {
    socket.sendMessage(
      "chat-leer",
      {
        origen: args[0],
      },
      (e, d) => {
        origen = d.origen;
        mensajes = d.mensajes
          .filter((item) => item)
          .sort((a, b) => a.mID - b.mID);
        actualizarVista();
        scrollIntoView(".msg-body");
      }
    );
  } else nav.url("#mensajes");

  function actualizarVista() {
    $("#read-sms").html(jsrender($("#rd-sms-body"), mensajes, msgHelp));
    $("#origen-sms").html(origen.nombre);
  }

  //responder
  $("#sms-form").submit(function (e) {
    e.preventDefault(e);
    let data = formControls(this);
    data.destino = origen.usID;
    formLock(this, true);
    socket.sendMessage("chat-nuevo", data, (e, d) => {
      formReset(this);
      data.enviado = new Date().toLocaleTimeString();
      data.origen = $usuario.usID;
      mensajes.push(data);
      actualizarVista();
      notificacion(e, "Mensaje enviado");
    });
  });
}
nav.paginas.addListener("mensaje/chat", mensajesLeer_nav);
/* END MENSAJES */

function conexiones_nav(p, args) {
  var tb = $("#con-table");
  setTimeout(updateView, 3000);
  $("#con-off").click(function () {
    var ok = confirm(
      "Esta funcion desconectara y desactivara todas las taquillas registradas"
    );
    if (ok) socket.sendMessage("taquilla-panic", null, updateView);
  });
  $("#con-view").click(updateView);

  function updateView() {
    tb.html(
      '<tr><td colspan="2"><i class="fa fa-spinner fa-spin"></i> Espere, cargando...</td></tr>'
    );
    socket.sendMessage("conexiones", null, function (e, d) {
      tb.html(jsrender($("#rd-conexiones"), d));
    });
  }
}
nav.paginas.addListener("conexiones", conexiones_nav);

function bancasSuspender_nav(p, args) {
  var ltSuspender = [];
  var cm = $("#sup-comer"),
    cbody = $("#cond-body");
  var bn = $("#sup-banca");

  cm.html(jsrender($("#rd-usuario-option"), $bancas));
  cm.change(function () {
    bn.html("");
  });
  cm.select2("val", "");

  var nivel2 = $("#nivel2");
  var nivel2val = false;
  nivel2.click(function () {
    nivel2val = $(this).is(":checked");
    $(".nivel2").toggleClass("hidden");
    if (nivel2val) getNivel2();
  });

  function getNivel2() {
    socket.sendMessage(
      "usuario-grupos",
      {
        usuarioID: cm.val(),
      },
      function (e, d) {
        bn.html(jsrender($("#rd-grupo-option"), d));
        bn.select2("val", "");
      }
    );
  }
  $("#suspnvo-form").submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    if (nivel2val) {
      data.sID = "g" + data.bID;
      delete data.bID;
    } else data.sID = "u" + data.sID;
    var form = formLock(this);
    socket.sendMessage("usuario-suspnvo", data, function (e, d) {
      formLock(form, false);
      cbody.html("");
      getLista();
    });
  });

  function getLista() {
    socket.sendMessage("usuario-listaSuspender", null, function (e, d) {
      d = d || [];
      d.sort(function (a, b) {
        if (a.c < b.c) {
          return -1;
        }
        if (a.c > b.c) {
          return 1;
        }
        return 0;
      });
      ltSuspender = d;
      cbody.html(jsrender($("#rd-cond-row"), d));

      $(".sprem").click(function (e) {
        e.preventDefault(e);
        var id = $(this).attr("usID");
        var c = confirm("SEGURO DESEA REMOVER ESTA CONDICION?");
        if (c) {
          socket.sendMessage(
            "usuario-susprem",
            {
              sID: id,
            },
            function (e, d) {
              var i = findBy("sID", id, ltSuspender);
              $("#r" + id).remove();
            }
          );
        }
      });
      bn.select2("val", "");
    });
  }
  getLista();
}
nav.paginas.addListener("bancas/suspensiones", bancasSuspender_nav);

function usuario_nav(p, args) {
  let claveCambiar = $("#cambiarClave");

  claveCambiar.submit((e) => {
    e.preventDefault(e);

    let data = formControls(claveCambiar);
    let clave1 = $("#clave1").val();
    let clave2 = $("#clave2").val();
    if (clave1 != clave2)
      return notificacion(
        "CLAVES NO COINCIDEN",
        "Las confirmacion de claves nuevas no coinciden, verifique e intente nuevamente."
      );
    socket.sendMessage("usuario", data, function (e, d) {
      if (d.hasOwnProperty("ok")) {
        notificacion("CAMBIO DE CLAVE EXITOSO");
        claveCambiar.reset();
      } else notificacion("ERROR", d.error);
    });
  });
}
nav.paginas.addListener("usuario", usuario_nav);
