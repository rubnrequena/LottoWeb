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
});
nav.paginas.addListener(Navegador.COMPLETE, function (p, a) {
  select2w($(".s2"), {
    allowClear: true,
    minimumResultsForSearch: 5,
  });

  // Minimize Button in Panels
  jQuery(".minimize").click(function () {
    var t = jQuery(this);
    var p = t.closest(".panel");
    if (!jQuery(this).hasClass("maximize")) {
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

  $(".toLower").change(function (e) {
    var a = $(e.target);
    a.val(a.val().toLowerCase());
  });
});

nav.paginas.addListener("login", login_nav);

function login_nav(p, arg) {
  $("#login-form").submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    socket.sendMessage("login", data, function (e, d) {
      var recordar = $("#recordar").is(":checked");

      if (recordar)
        localStorage.setItem("srq_lot_prm_login", JSON.stringify(data));
    });
  });
}

nav.paginas.addListener("inicio", inicio_nav);

function inicio_nav(p, arg) {
  var hlp = copyTo(_helpers);
  hlp.ganador = function (n) {
    var e = findBy("elementoID", n, $elementos);
    return e ? `#${e.descripcion}` : "";
  };
  socket.sendMessage("inicio", null, function (e, d) {
    if (d.hasOwnProperty("code")) {
    } else $("#srt_dia").html(jsrender($("#rd-sorteos-dia-row"), d.data, hlp));
    $("#str-dia-stamp").html(new Date(d.time).format("hh:MM TT"));
  });
}

function sorteoBuscar_nav(p, args) {
  var help = {
    padding: padding,
    sorteos: function (sorteo) {
      var s = "";
      var elem = exploreBy("sorteo", sorteo, $elementos);
      for (var i = 0; i < elem.length; i++) {
        s +=
          '<option value="' +
          elem[i].elementoID +
          '">#' +
          elem[i].numero +
          " " +
          elem[i].descripcion +
          "</option>";
      }
      return s;
    },
  };
  var srts = [];

  var toggles = $(".tgl");
  toggles.each(function (index) {
    var me = $(this);
    me.toggles({
      text: {
        on: "SI",
        off: "NO",
      },
      on: me.data("activo"),
      click: true,
    });
  });
  toggles.on("toggle", function (e, act) {
    update_sorteosView();
  });

  $("#srt-flt").change(function (e) {
    var flt = $(this).val();
    if (flt == 0) $("#flt-alerta").addClass("hidden");
    else $("#flt-alerta").removeClass("hidden");
  });
  $("#sorteo-buscar").submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    var f = formLock(this);
    socket.sendMessage("sorteos", data, function (e, d) {
      formLock(f, false);
      srts = d || [];
      update_sorteosView();
    });
  });

  function update_sorteosView() {
    var bsorteo = $("#buscar-sorteos");
    var s = uniqueVal(srts, "sorteo");
    var smin = [];
    s.forEach(function (item) {
      smin.push(findBy("sorteoID", item.sorteo, $sorteos));
    });
    bsorteo.html(jsrender($("#rd-operadora-option"), smin));
    bsorteo.select2("val", "");
    bsorteo.val("");
    bsorteo.select2("open");

    $(".bfiltro").change(function () {
      bsorteo.trigger("change");
    });

    bsorteo.change(function (ev) {
      var sorteo = ev.target.value;
      var sorteos = exploreBy("sorteo", sorteo, srts);
      //cargar elementos
      var elm = findBy("sorteo", sorteo, $elementos);
      if (elm) initUI();
      else {
        socket.sendMessage(
          "elementos",
          {
            sorteo: sorteo,
          },
          function (e, d) {
            $elementos = $elementos ? $elementos.concat(d) : d;
            initUI();
          }
        );
      }

      function initUI() {
        //filtros
        var ab = $("#srt-abr").val();
        var prm = $("#srt-prm").val();
        var flt = $("#srt-flt").val();

        var fsorteos = sorteos.filter(function (item) {
          var a, b;
          if (flt == 0) return true;
          else {
            if (ab == 1) a = item.abierta == true;
            else a = item.abierta == false;

            if (prm == 1) b = item.g ? true : false;
            else b = item.g == null;

            return a && b;
          }
        });

        //init
        $("#sorteos-body").html(jsrender($("#rd-sorteo-row"), fsorteos, help));

        var toggles = $(".ttgl");
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
          var data = {
            sorteo: $(e.target).data("target"),
            abierta: act,
          };
          socket.sendMessage("sorteo-editar", data, function (e, d) {
            console.log(e, d);
          });
        });

        select2w($(".s3"), {
          allowClear: true,
        });
        $("select.sorteosel").each(function (idx, item) {
          var s = $(item).data("select");
          $(item).val(s);
          $(item).select2("val", s);
        });
        $(".sorteosel").change(function (ev) {
          var val = ev.target.value;
          var e = $(this);
          var sorteo = e.data("sorteo");
          var el = findBy("elementoID", val, $elementos);
          var sr = findBy("sorteoID", sorteo, srts);
          var r = confirm(
            "Confirma que desea registrar #" +
              sr.sorteoID +
              " " +
              sr.descripcion +
              " #" +
              el.numero +
              " " +
              el.descripcion
          );
          if (r) {
            var data = {
              sorteoID: sorteo,
              elemento: val,
            };
            premiar(data, e);
          } else {
            e.select2("val", e.data("select"));
            e.val(e.data("select"));
          }
        });
      }

      function premiar(data, elm) {
        socket.sendMessage("sorteo-premiar", data, function (e, d) {
          var el;
          if (d.code == 1) {
            el = findBy("elementoID", data.elemento, $elementos);
            notificacion(
              "SORTEO PREMIADO",
              "SORTEO #" +
                data.sorteoID +
                " PREMIADO<p>GANADOR: #" +
                el.numero +
                " " +
                el.descripcion +
                "</p>"
            );
          } else if (d.code == 0) {
            el = findBy("elementoID", data.elemento, $elementos);
            notificacion(
              "[JV] SOLICITUD ACEPTADA",
              "SORTEO #" +
                data.sorteoID +
                "<p>GANADOR: #" +
                el.numero +
                " " +
                el.descripcion +
                "</p>"
            );
          } else if (d.code == 4) {
            notificacion(
              "SORTEOS",
              "SORTEO #" + data.sorteoID + " YA ESTA PREMIADO",
              "growl-danger"
            );
            var r = confirm("Este sorteo ya esta premiado, desea reiniciarlo");
            if (r) {
              socket.sendMessage(
                "sorteo-reiniciar",
                {
                  sorteoID: data.sorteoID,
                },
                function (e, d) {
                  notificacion(
                    "SORTEOS",
                    "SORTEO #" +
                      data.sorteoID +
                      " REINICIADO SATISFACTORIAMENTE"
                  );
                  if (
                    confirm(
                      "DESEA VOLVER A PREMIAR CON EL NUMERO SELECCIONADO?"
                    )
                  )
                    premiar(data, elm);
                }
              );
            } else {
              elm.select2("val", elm.data("select"));
              elm.val(elm.data("select"));
            }
          } else if (d.code == 3)
            notificacion(
              "SORTEOS",
              "SORTEO #" +
                data.sorteoID +
                " PREMIADO, PERO SIN VENTAS REGISTRADAS",
              "growl-danger"
            );
          else if (d.code == 5)
            notificacion(
              "SORTEO ABIERTO",
              " SORTEO #" + data.sorteoID + " AUN ESTA ABIERTO",
              "growl-danger"
            );
        });
      }
    });
  }

  function filtrar(item) {
    var a = $("#srt-abr").value;
    var p = $("#srt-prm").value;
    item.gid = item.gid || 0;
    console.log(item.abierta, a, item.gid, p);
    if (item.abierta == a && item.gid == p) {
      return true;
    } else return false;
  }
}
nav.paginas.addListener("sorteos/buscar", sorteoBuscar_nav);

function sorteoPremiar_nav() {
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
      var el;
      if (d.code == 1) {
        el = findBy("elementoID", data.elemento, $elementos);
        notificacion(
          "SORTEO PREMIADO",
          "SORTEO #" +
            data.sorteoID +
            " PREMIADO<p>GANADOR: #" +
            el.numero +
            " " +
            el.descripcion +
            "</p>"
        );
      } else if (d.code == 0) {
        el = findBy("elementoID", data.elemento, $elementos);
        notificacion(
          "[JV] SOLICITUD ACEPTADA",
          "SORTEO #" +
            data.sorteoID +
            " PREMIADO<p>GANADOR: #" +
            el.numero +
            " " +
            el.descripcion +
            "</p>"
        );
      } else if (d.code == 4)
        notificacion(
          "SORTEOS",
          "SORTEO #" + data.sorteoID + " YA ESTA PREMIADO",
          "growl-danger"
        );
      else if (d.code == 3)
        notificacion(
          "SORTEOS",
          "SORTEO #" + data.sorteoID + " PREMIADO, PERO SIN VENTAS REGISTRADAS",
          "growl-danger"
        );
      else if (d.code == 5)
        notificacion(
          "SORTEO ABIERTO",
          " SORTEO #" + data.sorteoID + " AUN ESTA ABIERTO",
          "growl-danger"
        );
    });
  });
  $("#reiniciar-form").submit(function (e) {
    e.preventDefault(e);
    var c = confirm("Seguro desea reiniciar premio?");
    if (c == 1) {
      var data = formControls(this);
      var f = formLock(this);
      socket.sendMessage("sorteo-reiniciar", data, function (e, d) {
        formLock(f, false);
        notificacion(
          "SORTEOS",
          "SORTEO #" + data.sorteoID + " REINICIADO SATISFACTORIAMENTE"
        );
      });
    }
  });

  function listarSorteos(fecha) {
    socket.sendMessage(
      "sorteos",
      {
        lista: fecha,
      },
      function (e, d) {
        sorteos = d || [];
        var sorteo = $("#premiar-sorteo");
        sorteo.html(jsrender(opt, sorteos));
        sorteo.select2("val", "");

        sorteo = $("#reiniciar-sorteo");
        sorteo.html(jsrender(opt, sorteos));
        sorteo.select2("val", "");
      }
    );
  }

  function listarNumeros(sorteo) {
    var srt = findBy("sorteoID", sorteo, sorteos);
    numeros.html(jsrender(rdElm, exploreBy("sorteo", srt.sorteo, $elementos)));
  }
  var d = new Date().format();
  listarSorteos(d);
}
nav.paginas.addListener("sorteos/premiar", sorteoPremiar_nav);

function sorteoMonitor_nav(e, arg) {
  var fecha = $("#sfecha");
  var sorteo = $("#ssorteos");
  var d = new Date();
  var dataForm;
  var sorteos;
  var mntfiltro;
  var filtrado;
  var help = _helpers;
  var hlp = {
    ganador: function (n) {
      var e = findBy("gid", n, sorteos);
      return e ? `#${e.gn}` : "";
    },
    labelColor: (n) => {
      if (n < 90) return "success";
      else if (n > 100) return "danger";
      else return "warning";
    },
  };

  var data, jg, tt;
  var ijg, isorteo, intData;

  $("#ord-num-num").click(function (e) {
    e.preventDefault(e);
    $(".order-num").removeClass("btn btn-primary btn-sm");
    $(this).addClass("btn btn-primary btn-sm");
    data.n.sort(function (a, b) {
      return a.numero - b.numero;
    });
    $("#numeros-body").html(jsrender($("#rd-vtnum-row"), data.n));
    actualizarVista();
  });
  $("#ord-num-jg").click(function (e) {
    e.preventDefault(e);
    $(".order-num").removeClass("btn btn-primary btn-sm");
    $(this).addClass("btn btn-primary btn-sm");
    data.n.sort(function (a, b) {
      return b.jugada - a.jugada;
    });
    $("#numeros-body").html(jsrender($("#rd-vtnum-row"), data.n));
    actualizarVista();
  });
  $("#ord-num-ntk").click(function (e) {
    e.preventDefault(e);
    $(".order-num").removeClass("btn btn-primary btn-sm");
    $(this).addClass("btn btn-primary btn-sm");
    data.n.sort(function (a, b) {
      return b.tickets - a.tickets;
    });
    $("#numeros-body").html(jsrender($("#rd-vtnum-row"), data.n));
    actualizarVista();
  });
  fecha.on("change", function (e) {
    listarSorteos(e.target.value);
  });
  $("#monitor-form").submit(function (e) {
    e.preventDefault(e);
    $(".order-num").removeClass("btn btn-primary btn-sm");
    $(".canReset").html("--");
    help.premio = function (m) {
      return ((m * 100) / jg).format($decimales);
    };
    help.ipremio = function (m) {
      return ((m * 100) / ijg).format($decimales);
    };
    help.gana = function (m) {
      return (m * 100) / jg > 100;
    };
    help.pdist = function (n) {
      return ((n * 100) / tt).format($decimales);
    };

    dataForm = formControls(this);
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

      jg = 0;
      tt = 0;
      var ld = d.t[0];
      d.t.forEach(function (item) {
        jg += item.jugada;
        if (item.jugada > ld.jugada) ld = item;
      });

      $("#jugada").html(jg.format($decimales));
      $("#bnLider").html(ld.banca);
      $("#bnLider-jg").html(ld.jugada.format($decimales));

      ld = d.n[0];
      d.n.forEach(function (item) {
        tt += item.tickets;
        item.pcj = (item.jugada * 100) / jg;
        if (item.jugada > ld.jugada) ld = item;
      });
      $("#numLider").html(ld.desc);
      $("#numLider-jg").html(ld.jugada.format($decimales));

      $("#ventas-body").html(jsrender($("#rd-ventas-row"), d.t));

      var idata = {
        fecha: fecha.val(),
        sorteo: findBy("sorteoID", dataForm.sorteoID, sorteos).sorteo,
      };

      socket.sendMessage(
        "sorteo-num-hist",
        {
          srt: idata.sorteo,
        },
        function (e, d) {
          var n;
          if (!d) d = [];
          d.forEach(function (item) {
            n = findBy("n", item.id, data.n);
            if (n) {
              n.lastd = dayLeft(item.f) + "d";
              n.lastf = item.f;
            }
            //$('#nh'+item.id).html(dayLeft(item.f)+"d").attr('title',item.f);
          });

          actualizarVista();
          reporteInicio();
        }
      );

      function reporteInicio() {
        socket.sendMessage("inicio", idata, function (e, d) {
          if (d.hasOwnProperty("code")) {
          } else {
            var t1 = 0,
              t2 = 0,
              t3 = 0;
            let row;
            for (var i = 0; i < d.data.length; i++) {
              row = d.data[i];
              t1 += row.jugado;
              t2 += row.premio;
              t3 += row.comision;
              row.pPremios = Number((row.premio * 100) / row.jugado).toFixed(2);
            }
            $("#gbalance").html((t1 - (t2 + t3)).format($decimales));
            $("#gjugada").html(t1.format($decimales));
            $("#gpremios").html(t2.format($decimales));
            $("#gcomision").html(t3.format($decimales));
            $("#srt_dia").html(
              jsrenderMerge($("#rd-sorteos-dia-row"), d.data, hlp)
            );
            $("#str-dia-stamp").html(d.time);

            tablaHandlers();
          }

          function tablaHandlers() {
            $(".cargarReporteTickets").click((e) => {
              e.preventDefault(e);
              let sorteo = $(e.currentTarget).attr("srt");
              let ganador = $(e.currentTarget).attr("gn");
              runSQL(reportesMap.monitorReporteTickets(sorteo, ganador)).then(
                (result) => {
                  reporteSorteo = reporteSorteo.concat(result);
                  let fila = findBy("sorteoID", sorteo, d.data);
                  fila.tickets = result.length;
                  $("#srt_dia").html(
                    jsrenderMerge($("#rd-sorteos-dia-row"), d.data, hlp)
                  );
                  tablaHandlers();
                }
              );
            });
            $("#srt_dia .mnt-vnt-tickets").click(function (e) {
              e.preventDefault(e);
              let sorteo = $(e.currentTarget).attr("srt");
              let num = $(e.currentTarget).attr("gn");
              socket.sendMessage(
                "sorteo-monitor-vnt",
                { numero: num, sorteo: sorteo },
                function (e, result) {
                  if (result == null) {
                    notificacion("NO HAY TICKETS DISPONIBLES");
                    return;
                  }
                  mntfiltro = result;
                  var us = uniqueVal(result, "us");
                  var bn = uniqueVal(result, "bc");
                  var tq = uniqueVal(result, "tq");

                  us.unshift({
                    us: 0,
                    usn: "TODAS",
                  });
                  bn.unshift({
                    bc: 0,
                    bnc: "TODAS",
                  });
                  tq.unshift({
                    tq: 0,
                    tqn: "TODAS",
                  });

                  var s2us = $("#mnt-ventas-us"),
                    s2bc = $("#mnt-ventas-bc"),
                    s2tq = $("#mnt-ventas-tq");
                  s2us.html(jsrender($("#rd-us-option"), us));
                  s2us.select2("val", 0);
                  s2bc.html(jsrender($("#rd-bn-option"), bn));
                  s2bc.select2("val", 0);
                  s2tq.html(jsrender($("#rd-tq-option"), tq));
                  s2tq.select2("val", 0);

                  $("#md-tickets-body").html(
                    jsrender($("#rd-num-ticket"), result)
                  );
                  actualizarVista_tickets(result);
                  var ns = findBy("n", num, data.n);
                  $("#md-tnum").html(ns.numero + " " + ns.desc);

                  $("#md-tktable").css("max-height", "400px");
                  $("#md-numventas").modal();

                  function uniqueVal(source, field, full) {
                    full = full == undefined ? true : full;
                    var flags = [],
                      output = [],
                      l = source.length,
                      i;
                    for (i = 0; i < l; i++) {
                      if (flags[source[i][field]]) continue;
                      flags[source[i][field]] = true;
                      if (full) output.push(source[i]);
                      else output.push(source[i][field]);
                    }
                    return output;
                  }
                }
              );
            });
          }

          let iReporte = 0;

          function cargarReporteTicket(data) {
            if (iReporte < data.length) {
              let r = data[iReporte];
              let sorteo = r.sorteoID;
              let ganador = r.ganador;
              runSQL(reportesMap.monitorReporteTickets(sorteo, ganador)).then(
                (result) => {
                  let ticketJugada = 0;
                  result.forEach((item) => (ticketJugada += item.monto));
                  let fila = findBy("sorteoID", sorteo, d.data);
                  fila.tickets = result.length;
                  fila.ticketJugado = ticketJugada;
                  fila.pJugada = Number(
                    (ticketJugada * 100) / fila.jugado
                  ).toFixed(1);
                  iReporte++;
                  cargarReporteTicket(data);
                }
              );
            } else {
              $("#srt_dia").html(
                jsrenderMerge($("#rd-sorteos-dia-row"), d.data, hlp)
              );
              tablaHandlers();
            }
          }
          cargarReporteTicket(d.data);
        });
      }
    });
  });

  $("#mnt-filtrar-tickets").submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    filtrado = mntfiltro.filter(function (item) {
      return item.us == data.usuario || data.usuario == 0;
    });
    filtrado = filtrado.filter(function (item) {
      return item.bc == data.banca || data.banca == 0;
    });
    filtrado = filtrado.filter(function (item) {
      return item.tq == data.taquilla || data.taquilla == 0;
    });
    $("#md-tickets-body").html(jsrender($("#rd-num-ticket"), filtrado));
    actualizarVista_tickets(filtrado);
  });
  $("#mnt-ticket-smonto").click(function (e) {
    e.preventDefault(e);
    var ord = parseInt($(this).attr("ord"));
    $(this).attr("ord", ord * -1);
    if (filtrado) {
      filtrado.sort(ordenarMonto);
      $("#md-tickets-body").html(jsrender($("#rd-num-ticket"), filtrado));
    } else {
      mntfiltro.sort(ordenarMonto);
      $("#md-tickets-body").html(jsrender($("#rd-num-ticket"), mntfiltro));
    }
    actualizarVista_tickets(mntfiltro || filtrado);

    function ordenarMonto(a, b) {
      if (ord == 1) {
        return a.m - b.m;
      } else {
        return b.m - a.m;
      }
    }
  });
  $("#mnt-ticket-sticket").click(function (e) {
    e.preventDefault(e);
    var ord = parseInt($(this).attr("ord"));
    $(this).attr("ord", ord * -1);
    if (filtrado) {
      filtrado.sort(ordenarMonto);
      $("#md-tickets-body").html(jsrender($("#rd-num-ticket"), filtrado));
    } else {
      mntfiltro.sort(ordenarMonto);
      $("#md-tickets-body").html(jsrender($("#rd-num-ticket"), mntfiltro));
    }
    actualizarVista_tickets(mntfiltro || filtrado);

    function ordenarMonto(a, b) {
      if (ord == 1) {
        return a.id - b.id;
      } else {
        return b.id - a.id;
      }
    }
  });

  $(".mnt-filtro-tickets").change(function () {
    $("#mnt-filtrar-tickets").submit();
  });

  function actualizarVista() {
    $("#numeros-body").html(jsrender($("#rd-vtnum-row"), data.n, help));

    $(".mnt-historial").click(function (e) {
      e.preventDefault(e);
      var num = $(this).attr("n");
      var help = {
        dateDif: dayLeft,
      };
      socket.sendMessage(
        "sorteo-num-hist",
        {
          n: num,
        },
        function (e, result) {
          var ns = findBy("n", num, data.n);
          $("#md-hnum").html(ns.numero + " " + ns.desc);
          $("#md-historia-body").html(jsrender($("#rd-num-row"), result, help));
          $("#md-numhist").modal();
        }
      );
    });
    $("#numeros-body .mnt-vnt-tickets").click(function (e) {
      e.preventDefault(e);
      var num = $(this).attr("n");
      socket.sendMessage(
        "sorteo-monitor-vnt",
        {
          numero: num,
          sorteo: dataForm.sorteoID,
        },
        function (e, result) {
          if (result == null) {
            notificacion("NO HAY TICKETS DISPONIBLES");
            return;
          }
          mntfiltro = result;
          var us = uniqueVal(result, "us");
          var bn = uniqueVal(result, "bc");
          var tq = uniqueVal(result, "tq");

          us.unshift({
            us: 0,
            usn: "TODAS",
          });
          bn.unshift({
            bc: 0,
            bnc: "TODAS",
          });
          tq.unshift({
            tq: 0,
            tqn: "TODAS",
          });

          var s2us = $("#mnt-ventas-us"),
            s2bc = $("#mnt-ventas-bc"),
            s2tq = $("#mnt-ventas-tq");
          s2us.html(jsrender($("#rd-us-option"), us));
          s2us.select2("val", 0);
          s2bc.html(jsrender($("#rd-bn-option"), bn));
          s2bc.select2("val", 0);
          s2tq.html(jsrender($("#rd-tq-option"), tq));
          s2tq.select2("val", 0);

          $("#md-tickets-body").html(jsrender($("#rd-num-ticket"), result));
          actualizarVista_tickets(result);
          var ns = findBy("n", num, data.n);
          $("#md-tnum").html(ns.numero + " " + ns.desc);

          $("#md-tktable").css("max-height", "400px");
          $("#md-numventas").modal();

          function uniqueVal(source, field, full) {
            full = full == undefined ? true : full;
            var flags = [],
              output = [],
              l = source.length,
              i;
            for (i = 0; i < l; i++) {
              if (flags[source[i][field]]) continue;
              flags[source[i][field]] = true;
              if (full) output.push(source[i]);
              else output.push(source[i][field]);
            }
            return output;
          }
        }
      );
    });
    $(".mnt-vnt-itickets").click(function (e) {
      e.preventDefault(e);
      var num = $(this).attr("n");
      intsocket.sendMessage(
        "sorteo-monitor-vnt",
        {
          numero: num,
          sorteo: isorteo,
        },
        function (e, result) {
          if (result == null) {
            notificacion("NO HAY TICKETS DISPONIBLES");
            return;
          }
          mntfiltro = result;
          var us = uniqueVal(result, "us");
          var bn = uniqueVal(result, "bc");
          var tq = uniqueVal(result, "tq");

          us.unshift({
            us: 0,
            usn: "TODAS",
          });
          bn.unshift({
            bc: 0,
            bnc: "TODAS",
          });
          tq.unshift({
            tq: 0,
            tqn: "TODAS",
          });

          var s2us = $("#mnt-ventas-us"),
            s2bc = $("#mnt-ventas-bc"),
            s2tq = $("#mnt-ventas-tq");
          s2us.html(jsrender($("#rd-us-option"), us));
          s2us.select2("val", 0);
          s2bc.html(jsrender($("#rd-bn-option"), bn));
          s2bc.select2("val", 0);
          s2tq.html(jsrender($("#rd-tq-option"), tq));
          s2tq.select2("val", 0);

          $("#md-tickets-body").html(jsrender($("#rd-num-ticket"), result));
          actualizarVista_tickets(result);
          var ns = findBy("n", num, intData);
          $("#md-tnum").html(ns.numero + " " + ns.desc);

          $("#md-tktable").css("max-height", "400px");
          $("#md-numventas").modal();

          function uniqueVal(source, field, full) {
            full = full == undefined ? true : full;
            var flags = [],
              output = [],
              l = source.length,
              i;
            for (i = 0; i < l; i++) {
              if (flags[source[i][field]]) continue;
              flags[source[i][field]] = true;
              if (full) output.push(source[i]);
              else output.push(source[i][field]);
            }
            return output;
          }
        }
      );
    });
    sorteos.forEach(function (item, index) {
      $("#rn" + item.gid).removeClass("hidden");
    });
    $(".mnt-prm").on("click", function (e) {
      e.preventDefault(e);
      var val = parseInt($(this).attr("num"));
      var data = {
        sorteoID: dataForm.sorteoID,
        elemento: val,
      };
      premiar(data, e);
    });
  }

  function actualizarVista_tickets(tickets) {
    if (!tickets) alert("No hay tickets que mostrar");
    $("#md-ntickets").html(tickets.length);

    var m = 0;
    for (var i = 0; i < tickets.length; i++) m += tickets[i].m;
    $("#md-mtickets").html(m.format($decimales));

    $(".fticket").click(function (e) {
      e.preventDefault(e);
      var md = $("#md-ticket");
      var val = parseInt($(this).attr("tid"));
      md.on("shown.bs.modal", function (e) {
        md.off("shown.bs.modal", arguments.callee);
        var input = $("#md-pagar-ticket");
        input.val(parseInt(val));
        input.focus();
      });
      md.on("hidden.bs.modal", function (e) {
        md.off("hidden.bs.modal", arguments.callee);
        $("#md-numventas").modal("show");
      });
      $("#md-numventas").modal("hide");

      md.modal("show");
    });
  }

  function listarSorteos(fecha) {
    sorteo.html("");
    let fechaDate = new Date(fecha);
    let now = new Date("2020-07-13");
    if (($usuario.usuario = "ruca" && fechaDate < now))
      return notificacion("No hay sorteos disponibles para esta fecha");
    socket.sendMessage(
      "sorteos",
      {
        lista: fecha,
      },
      function (e, d) {
        sorteos = d || [];
        sorteo.html(jsrender($("#rd-sorteo-option"), d));
        sorteo.select2("val", "");

        if (arg && arg.length > 1) {
          var b = parseInt(arg[1]);
          sorteo.prop("selectedIndex", b).change();
          $("#monitor-form").submit();
        }
      }
    );
  }

  function premiar(data, elm) {
    socket.sendMessage("sorteo-premiar", data, function (e, d) {
      var el;
      if (d.code == 1) {
        el = findBy("elementoID", data.elemento, $elementos);
        notificacion(
          "SORTEO PREMIADO",
          "SORTEO #" +
            data.sorteoID +
            " PREMIADO<p>GANADOR: #" +
            el.numero +
            " " +
            el.descripcion +
            "</p>"
        );

        listarSorteos(fecha.val());
        actualizarVista();
      } else if (d.code == 0) {
        el = findBy("elementoID", data.elemento, $elementos);
        notificacion(
          "[JV] SOLICITUD ACEPTADA",
          "SORTEO #" +
            data.sorteoID +
            "<p>GANADOR: #" +
            el.numero +
            " " +
            el.descripcion +
            "</p>"
        );
      } else if (d.code == 4) {
        notificacion(
          "SORTEOS",
          "SORTEO #" + data.sorteoID + " YA ESTA PREMIADO",
          "growl-danger"
        );
        var r = confirm("Este sorteo ya esta premiado, desea reiniciarlo?");
        if (r) {
          socket.sendMessage(
            "sorteo-reiniciar",
            {
              sorteoID: data.sorteoID,
            },
            function (e, d) {
              notificacion(
                "SORTEOS",
                "SORTEO #" + data.sorteoID + " REINICIADO SATISFACTORIAMENTE"
              );
              if (confirm("DESEA VOLVER A PREMIAR CON EL NUMERO SELECCIONADO?"))
                premiar(data, elm);
            }
          );
        } else {
          elm.select2("val", elm.data("select"));
        }
      } else if (d.code == 3)
        notificacion(
          "SORTEOS",
          "SORTEO #" + data.sorteoID + " PREMIADO, PERO SIN VENTAS REGISTRADAS",
          "growl-danger"
        );
      else if (d.code == 5)
        notificacion(
          "SORTEO ABIERTO",
          " SORTEO #" + data.sorteoID + " AUN ESTA ABIERTO",
          "growl-danger"
        );
    });
  }

  if (arg && arg.length > 0) {
    var a = arg[0].split("-");
    fecha.datepicker("setDate", new Date(a[0], parseInt(a[1]) - 1, a[2]));
    fecha.trigger("change");
  } else {
    listarSorteos(d.format());
  }
}
nav.paginas.addListener("monitor", sorteoMonitor_nav);

function reporteGeneral_nav(p, args) {
  args = fromParams(args ? args[0] : []);
  var f1 = $("#reporte-fecha1");
  var f2 = $("#reporte-fecha2");
  var reporte = $("#reporte");
  var rdata;
  reporte.submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    var f = formLock(this);
    var grp = $("#rp-agrupar").val();
    var now = new Date("2020-07-13");
    if (($usuario.usuario = "ruca" && new Date(data.inicio) < now)) {
      formLock(f, false);
      return notificacion("No hay reportes disponibles para la fecha");
    }
    socket.sendMessage(
      "reporte-sorteo-global",
      {
        d: data,
        a: grp,
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
          pr = 0,
          pg = 0,
          cm = 0,
          rn = 0;
        var srtIndex = [];
        var srtData = [];
        d.forEach(function (item) {
          item.balance = item.jugada - item.premio - item.comision;
          j += item.jugada;
          pr += item.premio;
          cm += item.comision;

          if (srtIndex.indexOf(item.sorteo) == -1) {
            srtIndex.push(item.sorteo);
            var sItem = findBy("sorteoID", item.sorteo, $sorteos);
            var nItems = exploreBy("sorteo", item.sorteo, rdata);
            var nTotal = 0;
            nItems.forEach(function (item) {
              nTotal += item.jugada;
            });
            sItem.jugada = nTotal;
            sItem.data = nItems;
            srtData.push(sItem);
          }
        });

        $("#mnt-jugado").html(j.format(0));
        $("#mnt-premios").html(pr.format(0));
        $("#mnt-comision").html(cm.format(0));
        $("#mnt-balance").html((j - pr - cm).format(0));

        $("#accordion").html(
          jsrenderMerge($("#rd-reporte"), srtData, {
            fechas: () => `${data.inicio}+${data.fin}`,
          })
        );

        $(".rptCollapse").on("shown.bs.collapse", function () {
          var sID = parseInt($(this).attr("sorteo"));
          var data = exploreBy("sorteo", sID, rdata);
          updateTotal(data);
        });
        $(".rptCollapse").on("hide.bs.collapse", function () {
          updateTotal(rdata);
        });
      }
    );
  });

  function updateTotal(d) {
    var j = 0,
      pr = 0,
      pg = 0,
      cm = 0,
      rn = 0;
    d.forEach(function (item) {
      item.balance = item.jugada - item.premio - item.comision;
      j += item.jugada;
      pr += item.premio;
      cm += item.comision;
    });
    $("#mnt-jugado").html(j.format(0));
    $("#mnt-premios").html(pr.format(0));
    $("#mnt-comision").html(cm.format(0));
    $("#mnt-balance").html((j - pr - cm).format(0));
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
  console.log("args :>> ", args);
  if (args.fechas) {
    var fechas = args.fechas.split(",");
    var a = fechas[0].split("-");
    var b = fechas[1].split("-");
    f1.datepicker("setDate", new Date(a[0], parseInt(a[1]) - 1, a[2]));
    f2.datepicker("setDate", new Date(b[0], parseInt(b[1]) - 1, b[2]));
    reporte.trigger("submit");
  }
}
nav.paginas.addListener("reporte/general", reporteGeneral_nav);

function reporteComercial_nav(p, args) {
  let fechas = getParameterByName("f");
  var comercial = getParameterByName("u");

  var f1 = $("#reporte-fecha1");
  var f2 = $("#reporte-fecha2");
  var reporte = $("#reporte");
  var rdata;
  reporte.submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    var f = formLock(this);
    reportes(
      "comercial",
      {
        inicio: data.inicio,
        fin: data.fin,
        comercial,
      },
      (e, d) => {
        d = d.d;
        formLock(f, false);
        if (!d) {
          $("#reporte-body").html("");
          $(".clr").html("--");
          return;
        }
        rdata = d;
        var j = 0,
          pr = 0,
          pg = 0,
          cm = 0,
          rn = 0;
        var srtIndex = [];
        var srtData = [];
        d.forEach(function (item) {
          item.balance = item.jugada - item.premio - item.comision;
          j += item.jugada;
          pr += item.premio;
          cm += item.comision;

          if (srtIndex.indexOf(item.sorteo) == -1) {
            srtIndex.push(item.sorteo);
            var sItem = findBy("sorteoID", item.sorteo, $sorteos);
            var nItems = exploreBy("sorteo", item.sorteo, rdata);
            var nTotal = 0;
            nItems.forEach(function (item) {
              nTotal += item.jugada;
            });
            sItem.jugada = nTotal;
            sItem.data = nItems;
            srtData.push(sItem);
          }
        });

        $("#mnt-jugado").html(j.format(0));
        $("#mnt-premios").html(pr.format(0));
        $("#mnt-comision").html(cm.format(0));
        $("#mnt-balance").html((j - pr - cm).format(0));

        $("#accordion").html(
          jsrenderMerge($("#rd-reporte"), srtData, {
            fechas: () => fechas,
          })
        );

        $(".rptCollapse").on("shown.bs.collapse", function () {
          var sID = parseInt($(this).attr("sorteo"));
          var data = exploreBy("sorteo", sID, rdata);
          updateTotal(data);
        });
        $(".rptCollapse").on("hide.bs.collapse", function () {
          updateTotal(rdata);
        });
      }
    );
  });

  function updateTotal(d) {
    var j = 0,
      pr = 0,
      pg = 0,
      cm = 0,
      rn = 0;
    d.forEach(function (item) {
      item.balance = item.jugada - item.premio - item.comision;
      j += item.jugada;
      pr += item.premio;
      cm += item.comision;
    });
    $("#mnt-jugado").html(j.format(0));
    $("#mnt-premios").html(pr.format(0));
    $("#mnt-comision").html(cm.format(0));
    $("#mnt-balance").html((j - pr - cm).format(0));
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

  if (fechas) {
    var a = fechas.split(" ")[0].split("-");
    var b = fechas.split(" ")[1].split("-");
    f1.datepicker("setDate", new Date(a[0], parseInt(a[1]) - 1, a[2]));
    f2.datepicker("setDate", new Date(b[0], parseInt(b[1]) - 1, b[2]));
    reporte.trigger("submit");
  }
}
nav.paginas.addListener("reporte/comercial", reporteComercial_nav);

function reporteUsuario_nav(p, args) {
  let fechas = getParameterByName("f");
  var usuario = getParameterByName("u");

  var f1 = $("#reporte-fecha1");
  var f2 = $("#reporte-fecha2");
  var reporte = $("#reporte");
  var rdata;
  reporte.submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    var f = formLock(this);
    reportes(
      "usuario",
      {
        inicio: data.inicio,
        fin: data.fin,
        usuario,
      },
      (e, d) => {
        d = d.d;
        formLock(f, false);
        if (!d) {
          $("#reporte-body").html("");
          $(".clr").html("--");
          return;
        }
        rdata = d;
        var j = 0,
          pr = 0,
          pg = 0,
          cm = 0,
          rn = 0;
        var srtIndex = [];
        var srtData = [];
        d.forEach(function (item) {
          item.balance = item.jugada - item.premio - item.comision;
          j += item.jugada;
          pr += item.premio;
          cm += item.comision;

          if (srtIndex.indexOf(item.sorteo) == -1) {
            srtIndex.push(item.sorteo);
            var sItem = findBy("sorteoID", item.sorteo, $sorteos);
            var nItems = exploreBy("sorteo", item.sorteo, rdata);
            var nTotal = 0;
            nItems.forEach(function (item) {
              nTotal += item.jugada;
            });
            sItem.jugada = nTotal;
            sItem.data = nItems;
            srtData.push(sItem);
          }
        });

        $("#mnt-jugado").html(j.format(0));
        $("#mnt-premios").html(pr.format(0));
        $("#mnt-comision").html(cm.format(0));
        $("#mnt-balance").html((j - pr - cm).format(0));

        $("#accordion").html(
          jsrenderMerge($("#rd-reporte"), srtData, {
            fechas: () => fechas,
          })
        );

        $(".rptCollapse").on("shown.bs.collapse", function () {
          var sID = parseInt($(this).attr("sorteo"));
          var data = exploreBy("sorteo", sID, rdata);
          updateTotal(data);
        });
        $(".rptCollapse").on("hide.bs.collapse", function () {
          updateTotal(rdata);
        });
      }
    );
  });

  function updateTotal(d) {
    var j = 0,
      pr = 0,
      pg = 0,
      cm = 0,
      rn = 0;
    d.forEach(function (item) {
      item.balance = item.jugada - item.premio - item.comision;
      j += item.jugada;
      pr += item.premio;
      cm += item.comision;
    });
    $("#mnt-jugado").html(j.format(0));
    $("#mnt-premios").html(pr.format(0));
    $("#mnt-comision").html(cm.format(0));
    $("#mnt-balance").html((j - pr - cm).format(0));
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

  if (fechas) {
    var a = fechas.split(" ")[0].split("-");
    var b = fechas.split(" ")[1].split("-");
    f1.datepicker("setDate", new Date(a[0], parseInt(a[1]) - 1, a[2]));
    f2.datepicker("setDate", new Date(b[0], parseInt(b[1]) - 1, b[2]));
    reporte.trigger("submit");
  }
}
nav.paginas.addListener("reporte/usuario", reporteUsuario_nav);

function sorteosUsuarios_nav(p, args) {
  var usuarios;
  socket.sendMessage("sorteos-usuarios", null, update);

  function update(e, d) {
    usuarios = d;
    $("#ubody").html(jsrender($("#usuario-row"), d));
    $(".usuario-rem").click(function (e) {
      var id = $(this).data("id");
      socket.sendMessage(
        "sorteo-usuario",
        {
          sid: id,
        },
        function (e, d) {
          if (d.code == 1) {
            notificacion("USUARIO REMOVIDO CON EXITO");
            var idx = findIndex("sID", id, usuarios);
            if (idx > -1) {
              usuarios.splice(idx, 1);
              update("sorteos-usuarios", usuarios);
            }
          } else
            notificacion("ERROR AL REMOVER USUARIO", null, "text-growl-danger");
        }
      );
    });
  }

  $("#reg-usuario").submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    var f = formLock(this);
    socket.sendMessage("sorteo-usuario", data, function (e, d) {
      formReset(f);
      if (d.code == 1) socket.sendMessage("sorteos-usuarios", null, update);
      else notificacion("ERROR AL REGISTRAR USUARIO", "Usuario no existe");
    });
  });
}
nav.paginas.addListener("sorteos/usuarios", sorteosUsuarios_nav);

nav.paginas.addListener("sorteos/pendientes", function (p, args) {
  var help = {
    padding: padding,
    sorteos: function (sorteo) {
      var s = "";
      var elem = exploreBy("sorteo", sorteo, $elementos);
      for (var i = 0; i < elem.length; i++) {
        s +=
          '<option value="' +
          elem[i].elementoID +
          '">#' +
          elem[i].numero +
          " " +
          elem[i].descripcion +
          "</option>";
      }
      return s;
    },
  };
  $("#sorteo-buscar").submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    var f = formLock(this);
    var sn, s, res;
    socket.sendMessage("sorteo-pendientes", data, function (e, d) {
      formLock(f, false);
      if (!d || d.length == 0) return;
      res = d;

      (sn = []), (s = []);
      for (var i = 0; i < d.length; i++) {
        var x = sn.indexOf(d[i].sorteo);
        if (x == -1) {
          sn.push(d[i].sorteo);
          s.push({
            descripcion: findBy("sorteoID", d[i].sorteo, $sorteos).nombre,
            sorteo: d[i].sorteo,
            horarios: [d[i]],
          });
        } else {
          var sr = s[x];
          sr.horarios.push(d[i]);
        }
      }

      if ($elementos && $elementos.length > 0) initUI();
      else {
        socket.addListener("elementos", elementos_result);
        socket.sendMessage("elementos", {
          sorteos: sn,
        });

        function elementos_result(e, d) {
          if (d == "end") initUI();
          else $elementos = $elementos.concat(d);
        }
      }
    });

    function initUI() {
      $("#accordion").html(jsrender($("#rd-sorteo-row"), s, help));
      select2w($(".s3"), {
        allowClear: true,
      });
      $("select.sorteosel").each(function (idx, item) {
        var s = $(item).data("select");
        $(item).val(s);
        $(item).select2("val", s);
      });
      $(".sorteosel").change(function (ev) {
        var val = ev.target.value;
        var e = $(this);
        var sorteo = e.data("sorteo");
        var el = findBy("elementoID", val, $elementos);
        var sr = findBy("sorteoID", sorteo, res);
        var r = confirm(
          "Confirma que desea registrar #" +
            sr.sorteoID +
            " " +
            sr.descripcion +
            " #" +
            el.numero +
            " " +
            el.descripcion
        );
        if (r) {
          var data = {
            sorteoID: sorteo,
            elemento: val,
          };
          premiar(data, e);
        } else {
          e.select2("val", e.data("select"));
          e.val(e.data("select"));
        }
      });
    }

    function premiar(data, elm) {
      socket.sendMessage("sorteo-premiar", data, function (e, d) {
        var el;
        if (d.code == 1) {
          el = findBy("elementoID", data.elemento, $elementos);
          notificacion(
            "SORTEO PREMIADO",
            "SORTEO #" +
              data.sorteoID +
              " PREMIADO<p>GANADOR: #" +
              el.numero +
              " " +
              el.descripcion +
              "</p>"
          );
        } else if (d.code == 0) {
          el = findBy("elementoID", data.elemento, $elementos);
          notificacion(
            "[JV] SOLICITUD ACEPTADA",
            "SORTEO #" +
              data.sorteoID +
              "<p>GANADOR: #" +
              el.numero +
              " " +
              el.descripcion +
              "</p>"
          );
        } else if (d.code == 4) {
          notificacion(
            "SORTEOS",
            "SORTEO #" + data.sorteoID + " YA ESTA PREMIADO",
            "growl-danger"
          );
          var r = confirm("Este sorteo ya esta premiado, desea reiniciarlo");
          if (r) {
            socket.sendMessage(
              "sorteo-reiniciar",
              {
                sorteoID: data.sorteoID,
              },
              function (e, d) {
                notificacion(
                  "SORTEOS",
                  "SORTEO #" + data.sorteoID + " REINICIADO SATISFACTORIAMENTE"
                );
                if (
                  confirm("DESEA VOLVER A PREMIAR CON EL NUMERO SELECCIONADO?")
                )
                  premiar(data, elm);
              }
            );
          } else {
            elm.select2("val", elm.data("select"));
            elm.val(elm.data("select"));
          }
        } else if (d.code == 3)
          notificacion(
            "SORTEOS",
            "SORTEO #" +
              data.sorteoID +
              " PREMIADO, PERO SIN VENTAS REGISTRADAS",
            "growl-danger"
          );
        else if (d.code == 5)
          notificacion(
            "SORTEO ABIERTO",
            " SORTEO #" + data.sorteoID + " AUN ESTA ABIERTO",
            "growl-danger"
          );
      });
    }
  });
});
nav.paginas.addListener("historia", function historiaNav(p, args) {
  socket.sendMessage("lsorteos", null, (e, d) => {
    $("#sorteos").html(jsrender($("#rd-sorteo-option"), d));
  });

  $("#historiaForm").submit(function (e) {
    e.preventDefault();
    let sorteo = formControls(this);

    socket.sendMessage("sorteo-num-hist", sorteo, (e, d) => {
      d = d.sort((a, b) => a.id - b.id);
      d.forEach((item) => {
        item.ultimo = dayLeft(item.f);
      });
      $("#historiaTable").html(jsrender($("#rd-sorteo-row"), d));
    });
  });
});

function dayLeft(d) {
  var _now = new Date().format().split("-");
  var now = new Date(_now[0], _now[1] - 1, _now[2]);
  var da = d.split("-");
  var dd = new Date(da[0], da[1] - 1, da[2]);
  return Math.round((now.getTime() - dd.getTime()) / 86400000, 0);
}

function reportes(name, data, cb) {
  let reporte = reportesMap[name](data);
  socket.sendMessage(
    "sql-command",
    {
      sql: reporte,
    },
    (e, d) => cb(e, d)
  );
}
let reportesMap = {
  comercial: ({ comercial, inicio, fin }) => {
    return `SELECT sorteos.sorteo, usuarios.usuarioId cid, usuarios.nombre desc, SUM(reportes.jugada) jugada, SUM(reportes.premio) premio, ROUND(SUM(jugada*reportes.comision*0.01),0) comision 
        FROM reportes
          JOIN vt.sorteos ON sorteos.sorteoID = reportes.sorteoID 
          JOIN us.bancas ON bancas.bancaID = reportes.bancaID 
          JOIN us.usuarios ON usuarios.usuarioID = bancas.usuarioID
          JOIN us.comer_usuario ON comer_usuario.uid = bancas.usuarioID
          WHERE 
          comer_usuario.cID = ${comercial} AND
          sorteos.sorteo IN (SELECT sorteoID  FROM admins_meta JOIN main.sorteos ON admins_meta.valor = sorteos.sorteoID WHERE adminID = ${$usuario.adminID})
          AND reportes.fecha BETWEEN "${inicio}" AND "${fin}"
          GROUP BY sorteos.sorteo, usuarios.usuarioID
          ORDER BY sorteos.sorteo`
      .split("\n")
      .join("");
  },
  usuario: ({ usuario, inicio, fin }) => {
    return `SELECT sorteos.sorteo, usuarios.usuarioId cid, bancas.nombre desc, SUM(reportes.jugada) jugada, SUM(reportes.premio) premio, ROUND(SUM(jugada*reportes.comision*0.01),0) comision 
      FROM reportes
        JOIN vt.sorteos ON sorteos.sorteoID = reportes.sorteoID 
        JOIN us.bancas ON bancas.bancaID = reportes.bancaID 
        JOIN us.usuarios ON usuarios.usuarioID = bancas.usuarioID
        JOIN us.comer_usuario ON comer_usuario.uid = bancas.usuarioID
        WHERE 
        usuarios.usuarioID = ${usuario} AND
        sorteos.sorteo IN (SELECT sorteoID  FROM admins_meta JOIN main.sorteos ON admins_meta.valor = sorteos.sorteoID WHERE adminID = ${$usuario.adminID})
        AND reportes.fecha BETWEEN "${inicio}" AND "${fin}"
        GROUP BY sorteos.sorteo, bancas.bancaID
        ORDER BY sorteos.sorteo`
      .split("\n")
      .join("");
  },
  monitorReporteTickets: (sorteo, numero) => {
    return `SELECT usuarios.usuarioID, usuarios.nombre banca, elementos.taquillaID, taquillas.nombre taquilla, elementos.bancaID, bancas.nombre grupo, ticketID, monto FROM vt.elementos 
      JOIN us.bancas ON bancas.bancaID = elementos.bancaID
      JOIN us.taquillas ON taquillas.taquillaID = elementos.taquillaID
      LEFT JOIN us.usuarios ON usuarios.usuarioID = bancas.usuarioID
    WHERE anulado = false AND sorteoID = ${sorteo} AND numero = ${numero}`
      .split("\n")
      .join("");
  },
};

function runSQL(sql) {
  return new Promise((resolve, reject) => {
    let result = [];
    socket.sendMessage("sql-command", {
      sql,
    });
    socket.addListener("sql-command", (e, d) => {
      if (d.last == 1) {
        socket.removeListener("sql-command", arguments.callee);
        resolve(result);
      } else result = result.concat(d.d);
    });
  });
}

function premiador_nav(p, args) {
  var buscarForm = $("#bot-buscarForm");
  var tabla = $("#botTable");
  var rd_tablaFila = $("#rd-bot-row");
  var rd_operadoraOption = $("#rd-operadora-option");
  var rd_sorteoOption = $("#rd-sorteo-option");
  var modal = $("#md-botRegistro");
  var registroForm = $("#bot-registro");
  var registroFecha = $("#bot-registroFecha");
  var registroSorteos = $("#bot-registroSorteos");
  var operadora = $("#bot-operadora");
  var operadoraSeleccionada = 0;
  var nuevoModal_btn = $("#bot-nuevoModal");
  var botRemover = $(".bot-remover");

  var botData = [];

  function init() {
    buscarForm.submit(buscarSubmit);
    socket.sendMessage("lsorteos", null, (e, d) => {
      operadora.html(jsrender(rd_operadoraOption, d));
      operadora.select2("val", "");
    });
    registroFecha.change((e) => {
      let fecha = e.currentTarget.value;
      socket.sendMessage(
        "sorteos",
        {
          lista: fecha,
        },
        (e, d) => {
          let sorteos = d.filter((d) => d.sorteo == operadoraSeleccionada);
          registroSorteos.html(jsrender(rd_sorteoOption, sorteos));
          registroSorteos.select2("val", "");
        }
      );
    });
    operadora.on("change", (e) => buscarForm.trigger("submit"));
    registroForm.submit(registroSubmit);
  }
  init();

  function buscarSubmit(e) {
    if (e) e.preventDefault();
    let data = formControls(buscarForm);
    formLock(buscarForm);
    operadoraSeleccionada = data.operadora;
    nuevoModal_btn.removeAttr("disabled");
    socket.sendMessage("premio-bot-lista", data, (e, d) => {
      formLock(buscarForm, false);
      botData = d;
      ui_updateRegistros();
    });
  }

  function registroSubmit(e) {
    e.preventDefault(e);
    let data = formControls(registroForm);
    data.operadora = operadoraSeleccionada;
    formLock(registroForm);
    socket.sendMessage("premio-bot-nuevo", data, (e, d) => {
      formLock(registroForm, false);
      buscarSubmit();
    });
  }

  function ui_updateRegistros() {
    tabla.html(jsrender(rd_tablaFila, botData));
    $(".bot-remover").click((e) => {
      e.preventDefault(e);
      const botID = $(e.currentTarget).attr("botid");
      socket.sendMessage(
        "premio-bot-remover",
        {
          botID,
        },
        (e, d) => buscarSubmit()
      );
    });
  }
}
nav.paginas.addListener("premiador", premiador_nav);
