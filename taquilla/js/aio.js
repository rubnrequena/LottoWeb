'use strict'
var CONFIG = {
  INTERFAZ_MODO: "srq.taq.modoInterfaz",
  IMPRIMIR_TECLA: "srq.taq.imprimirTecla",
  IMPRIMIR_FORMATO: "srq.taq.formatoImpresion",
  IMPRIMIR_MODO: "srq.taq.modoImpresion",
  IMPRIMIR_LETRASxLINEA: "srq.taq.letrasLinea",
  SORTEOS_ORDEN: "srq.taq.ordenSorteos",
  SMS_KEY: "srq.taq.smskey",
  ELEMENTOS_HASH: "srq.taq.helementos",
  ELEMENTOS: "srq.taq.elementos",
  MONEDA: "srq.taq.moneda",
  NOMBRE_CLIENTE: "srq.taq.nombreCliente",
};
var init = function () {
  // VARS
  var storage = localStorage;
  var devHost = sessionStorage.getItem("ruta");
  // SOCKET
  var host = devHost || $.cookie("taquilla") || location.hostname + ":4022";
  var socket;
  //CONFIG
  var config = {
    modoImpresion: storage.getItem(CONFIG.IMPRIMIR_MODO) || 1,
    imprimirTecla: storage.getItem(CONFIG.IMPRIMIR_TECLA) || 107,
    formatoImpresion: storage.getItem(CONFIG.IMPRIMIR_FORMATO) || 0,
    letrasLinea: storage.getItem(CONFIG.IMPRIMIR_LETRASxLINEA) || 25,
    ordenSorteos: storage.getItem(CONFIG.SORTEOS_ORDEN) || 0,
    modoInterfaz: storage.getItem(CONFIG.INTERFAZ_MODO) || "ventamax",
    moneda: storage.getItem(CONFIG.MONEDA) || "",
    nombreCliente: storage.getItem(CONFIG.NOMBRE_CLIENTE) || 0,
  };

  function setConfig(key, val) {
    storage.setItem(key, val);
    config[key.split(".").pop()] = val;

    if (key == CONFIG.INTERFAZ_MODO) $("#ventalink").attr("href", `#${val}`);
  }
  $("#ventalink").attr("href", `#${config.modoInterfaz || "ventamax"}`);
  $("#rutaAlt").click((e) => {
    e.preventDefault();
    let uri = $(e.target).attr("url");
    sessionStorage.setItem("ruta", uri);
    location.reload();
  });
  //IMPRESORA
  var canPrint = false;
  var grt;
  var print = new Net("ws://127.0.0.1:9999", false);
  print.addListener(NetEvent.SOCKET_OPEN, function (e) {
    canPrint = true;
    notificacion("ASISTENTE IMPRESION", "CONEXION EXITOSA", "growl-success");
  });
  print.addListener(NetEvent.SOCKET_CLOSE, function (e) {
    canPrint = cliente.isMobile() ? true : false;
    if (config.formatoImpresion == 0 && cliente.isMobile() == false) {
      grt = notificacion(
        "ASISTENTE IMPRESION",
        jsrender($("#rd-print-alert")),
        "growl-danger",
        true
      );
      $(".print-rcn").off("click", onPrint);
      $(".print-rcn").on("click", onPrint);
    }
  });

  function onPrint() {
    $("#gritter-item-" + grt).remove();
    print.connect();
  }
  print.connect();

  //WS
  let wsform = $("#ws-send");
  let wscheck = JSON.parse(storage.getItem("srqtaq.ws.enviados")) || [];
  let wsban = JSON.parse(storage.getItem("srqtaq.ws.banned")) || [];

  $("#ws-count").html(wscheck.length);
  for (let i = 0; i < wsban.length; i++) {
    const ban = wsban[i];
    const now = new Date().getTime();
    if (now > ban.hasta) {
      wsban.splice(i, 1);
      storage.setItem("srqtaq.ws.banned", JSON.stringify(wsban));
    }
  }
  wsform.submit(function (e) {
    e.preventDefault(e);
    let data = formControls(this);
    for (let i = 0; i < wsban.length; i++) {
      const ws = wsban[i];
      if (ws.numero == data.numero) {
        $("#wsban-alert").removeClass("hidden");
        setTimeout(wsBanAlert, 5000);
        return;
      }
    }

    function wsBanAlert(params) {
      $("#wsban-alert").addClass("hidden");
    }
    wsSend(data.numero, data.mensaje);
    $("#wsban-alert").addClass("hidden");
    wsform[0].reset();
  });

  function wsSend(num, msg) {
    if (!$usuario) return;
    if (num.toString().indexOf("58") != 0) num = `58${num}`;
    let send = `http://104.129.171.151:3000/enviar/${num}/?texto=${msg}`;
    fetch(send)
      .then((res) => res.json())
      .then((data) => {
        wscheck.push(data);
        storage.setItem("srqtaq.ws.enviados", JSON.stringify(wscheck));
        $("#ws-count").html(wscheck.length);
      });
  }
  setInterval(() => {
    for (let i = wscheck.length - 1; i >= 0; i--) {
      const msg = wscheck[i];
      fetch(`http://104.129.171.151:3000/msg/${msg._id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.hasOwnProperty("error")) {
            wscheck.splice(i, 1);
            notificacion(
              "Whatsapp",
              `<p>Mensaje NO enviado<br>Razon: Numero Incorrecto o No Existe</p><p>Numero: ${data.numero}</p>`,
              "growl-danger"
            );
            storage.setItem("srqtaq.ws.enviados", JSON.stringify(wscheck));
            wsban.push({
              numero: data.numero,
              hasta: new Date().getTime() + 1000 * 60 /**60*24*/,
            });
            storage.setItem("srqtaq.ws.banned", JSON.stringify(wsban));
          } else if (data.hasOwnProperty("enviado")) {
            wscheck.splice(i, 1);
            notificacion(
              "Whatsapp",
              `<p>Mensaje enviado</p><p>Numero: ${data.numero}</p>`,
              "growl-success"
            );
            storage.setItem("srqtaq.ws.enviados", JSON.stringify(wscheck));
          }
          $("#ws-count").html(wscheck.length);
        });
    }
  }, 5000);

  //NAVEGADOR
  var nav = new Navegador();
  nav.folder = "paginas";
  nav.viewport = ".contentpanel";
  nav.validate = function (page, params) {
    //if (window.location.hostname!="srq.com.ve") page = "507"; //SOLO PARA PRODUCCION
    if (page == "507") return page;
    return $usuario ? page : "login";
  };

  // SISTEMA
  var $usuario;
  var $elementos;
  var $sorteos;
  var $numeros;
  var $servidor = {};
  var $meta = {};

  //ACTIVIDADES
  function sorteosDisponibles_filtro(s) {
    return s.cierra > $servidor.hora && s.abierta == true;
  }

  function getElemento(id, sorteoID) {
    const sorteo = $sorteos.find((s) => s.sorteoID == sorteoID);
    const elementos = $elementos[sorteo.sorteo];
    return elementos.find((e) => e.id == id);
  }

  function getSorteo(id) {
    return findBy("sorteoID", id, $sorteos);
  }

  function sorteosInvalidos(s) {
    var ss;
    var a = [];
    s.forEach(function (item) {
      ss = findBy("sorteoID", item, $sorteos);
      a.push(
        ss ? "<p>" + ss.descripcion + "</p>" : "<p>" + padding(item, 5) + "</p>"
      );
    });
    return a.join("");
  }

  function topeExedido(data) {
    var e,
      s,
      t,
      a = [];
    data.forEach(function (tope) {
      e = findBy("id", tope.n, $elementos);
      s = findBy("sorteoID", tope.s, $sorteos);
      t = tope.hasOwnProperty("td")
        ? "CUPO DISPONIBLE: " + tope.td
        : "CUPO DISPONIBLE: " + tope.tm;
      if (e && s)
        a.push("<p>" + s.descripcion + ": " + e.d + "</p><p>" + t + "</p>");
    });
    return a.join("");
  }
  // NAVEGADOR //
  var cliente = new ClientJS();
  nav.paginas.addListener(Navegador.ENTER, function (p, a) {
    // Adjust mainpanel height
    var main = jQuery(".mainpanel");
    var docHeight = jQuery(document).height();
    var mh = main.height();
    if (docHeight > mh) main.height(docHeight);

    select2w($(".s2"), {
      hideSelectionFromResult: function (a) {
        return true;
      },
      placeholder: "Seleccione...",
      language: "es",
    });

    $(".date").datepicker({
      dateFormat: "yy-mm-dd",
    });
    $(".now").datepicker("setDate", new Date());
  });
  nav.paginas.addListener(Navegador.COMPLETE, function (p, a) {
    // Minimize Button in Panels
    var heading = jQuery(".panel-heading");
    heading.attr("title", "Click para expandir y/o contraer panel");
    heading.click(function () {
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
    // Close Button in Panels

    jQuery(".panel .panel-close").click(function () {
      jQuery(this).closest(".panel").fadeOut(200);
      return false;
    });
  });
  nav.paginas.addListener("login", function (p, args) {
    $("#login-form").submit(function (e) {
      e.preventDefault(e);
      var data = formControls(this);
      var f = formLock(this);
      login(data, function (e, d) {
        formLock(f, false);
        if (d.hasOwnProperty("code")) {
          if (d.code == 2) notificacion("CLAVE INVALIDA");
        } else {
          var recordar = $("#recordar").is(":checked");
          if (recordar) storage.setItem("loto_taqlogin", JSON.stringify(data));
          else storage.removeItem("loto_taqlogin");
        }
      });
    });
  });
  nav.paginas.addListener("inicio", function (p, a) {
    var help = {
      gano: function (g) {
        var e = findBy("id", g, $elementos);
        if (e) return g == 0 ? "" : "#" + e.n + " " + e.d;
        else return "NA";
      },
      formatDate: dateFormat,
    };
    var timer;

    $("#pagina-tiulo").html(
      '<i class="fa fa-home"></i> Bienvenido, ' + $usuario.nombre
    );

    if ($sorteos) {
      timer = setInterval(sorteosTiempoRestante, 60000);
      $("#sorteos-body").html(
        jsrender($("#rd-inicio-sorteos-row"), $sorteos, help)
      );
      sorteosTiempoRestante();
    }

    function sorteosTiempoRestante() {
      // TODO: VALIDAR QUE HAYAN SORTEOS
      var p = nav.current().page;
      if (p != "inicio") {
        clearInterval(timer);
        return;
      }
      $("#servidor-tiempo").html(
        dateFormat($servidor.hora, "TZ:240 dd/mm/yy hh:MM TT")
      );
      $sorteos.forEach(function (sorteo) {
        if (sorteo.abierta && sorteo.cierra > $servidor.hora)
          $("#srt-resta-" + sorteo.sorteoID).html(
            msToString(sorteo.cierra - $servidor.hora)
          );
        else
          $("#srt-resta-" + sorteo.sorteoID).html(
            "<label class='label label-danger'>CERRADO</label>"
          );
      });
    }
  });
  nav.paginas.addListener("venta", venta_nav);
  nav.paginas.addListener("ventamax", venta_nav);
  nav.paginas.addListener("visual", venta_nav);
  nav.paginas.addListener("visual", (p, args) => {
    let montoInput = $("#montoAnimal"),
      montoModal = $("#md-montoVenta");
    montoModal.on("shown.bs.modal", () => {
      $("#md-montoInput").focus();
      $("#md-montoInput").select();
    });
    $(document).on("keydown", ventaTeclado);
    let keyPressed = "";
    let pressTime;

    function ventaTeclado(e) {
      if (e.keyCode >= 95 && e.keyCode <= 105) {
        let n = e.key;
        if (e.ctrlKey) {
          keyPressed += n;
          clearTimeout(pressTime);
          pressTime = setTimeout(() => {
            $("#vnt-numeros").val(keyPressed);
            $("#md-montoVenta").modal();
            keyPressed = "";
          }, 2000);
        }
      }
    }

    montoInput.submit(function (e) {
      e.preventDefault(e);
      let data = formControls(this);
      $("#vnt-monto").val(data.monto);
      $("#vnt-venta").trigger("submit");
      montoModal.modal("hide");
    });

    let npanel = $("#numpanel");
    for (let i = 0; i <= 36; i++) {
      if (i == 0)
        npanel.append(
          `<div class="numcell" numero="0"><img src="/assets/animales/0.jpg" class="numero"/><div class="overlay"></div></div>`
        );
      npanel.append(
        `<div class="numcell" numero="${zero(
          i
        )}"><img src="/assets/animales/${zero(
          i
        )}.jpg" class="numero"/><div class="overlay"></div></div>`
      );
    }

    function zero(n) {
      return n < 10 ? `0${n}` : n.toString();
    }

    $(".numcell").click(function (e) {
      let num = $(this).attr("numero");
      $("#vnt-numeros").val(num.toString());
      $("#md-montoVenta").modal();
    });
  });
  var vendiendo = false;

  function venta_nav(p, args) {
    if (!$sorteos) {
      nav.nav("101");
      return;
    }
    var triplesAcciones = $("#triples-acciones");
    var triplesConTerminal = $("#terminales-marca");
    //#region serie
    const mdSerie = $("#md-serie");
    mdSerie.on("shown.bs.modal", (e) => $("#serie-numero").focus());
    const serieBtn = $("#serie-btn");
    serieBtn.click((e) => mdSerie.modal());
    const serieForm = $("#serie-form");
    serieForm.submit(serieForm_submit);
    function serieForm_submit(e) {
      e.preventDefault(e);
      const data = formControls(this);
      const numeros = crearSerie(data.numero);
      const jugada = num.val().trim() + " ";
      num.val(jugada + numeros.join(" "));
      mdSerie_close();
    }
    function crearSerie(input) {
      input = parseInt(input);
      if (isNaN(input)) return;
      const exp = 100;
      const max = 1000;
      let ultValor = input;
      let valores = [];
      while (ultValor < max) {
        valores.push(formatoTriple(ultValor));
        ultValor += exp;
      }
      return valores;
    }
    function mdSerie_close() {
      mdSerie.modal("hide");
      serieForm[0].reset();
    }
    //#endregion
    //#region corrida
    const mdCorrida = $("#md-corrida");
    mdCorrida.on("shown.bs.modal", (e) => $("#corrida-numero").focus());
    const corridaBtn = $("#corrida-btn");
    corridaBtn.click((e) => mdCorrida.modal());
    const corridaForm = $("#corrida-form");
    corridaForm.submit(corridaForm_submit);
    function corridaForm_submit(e) {
      e.preventDefault(e);
      const data = formControls(this);
      const numeros = crearCorrida(data.numero);
      const jugada = num.val().trim() + " ";
      num.val(jugada + numeros.join(" "));
      mdCorrida_close();
    }
    function crearCorrida(input) {
      const inputs = input.split(" ");
      let min = parseInt(inputs[0]);
      const max = parseInt(inputs[1]);
      if (isNaN(min) || isNaN(max)) return;
      let valores = [];
      while (min <= max) {
        valores.push(formatoTriple(min++));
      }
      return valores;
    }
    function mdCorrida_close() {
      mdCorrida.modal("hide");
      corridaForm[0].reset();
    }
    //#endregion
    //#region permuta
    const mdPermuta = $("#md-permuta");
    mdPermuta.on("shown.bs.modal", (e) => $("#permuta-numero").focus());
    const permutaForm = $("#permuta-form");
    permutaForm.submit(permutaForm_submit);
    const permutaBtn = $("#permuta-btn");
    permutaBtn.click((e) => mdPermuta.modal());

    function permutaForm_submit(e) {
      e.preventDefault(e);
      const data = formControls(this);
      const numeros = permutar(data.numero);
      const jugada = num.val().trim() + " ";
      num.val(jugada + numeros.join(" "));
      mdPermuta_close();
    }
    function permutar(input) {
      input = formatoTriple(input);
      if (isNaN(input)) return;
      let result = input
        .toString()
        .split("")
        .reduce(function permute(res, item, key, arr) {
          return res.concat(
            (arr.length > 1 &&
              arr
                .slice(0, key)
                .concat(arr.slice(key + 1))
                .reduce(permute, [])
                .map(function (perm) {
                  return [item].concat(perm);
                })) ||
              item
          );
        }, []);
      return result
        .map((r) => r.join(""))
        .reduce((acc, item) => {
          if (acc.indexOf(item) > -1) return acc;
          acc.push(item);
          return acc;
        }, []);
    }
    function mdPermuta_close() {
      mdPermuta.modal("hide");
      permutaForm[0].reset();
    }
    //#endregion
    $("#md-copy-ticket").on("hidden.bs.modal", function (e) {
      sorteos.select2("focus");
    });

    function copiarAPortapapeles() {
      var copyText = document.getElementById("md-ticket-text");
      copyText.select();
      copyText.setSelectionRange(0, 99999); /*For mobile devices*/
      document.execCommand("copy");
      copyClip_btn.text("Ticket copiado!");
      copyClip_btn.addClass("btn-success");
      setTimeout(() => {
        copyClip_btn.text("Copiar");
        copyClip_btn.removeClass("btn-success");
      }, 4000);
    }
    const copyClip_btn = $("#btn_copyClipboard");
    copyClip_btn.click(copiarAPortapapeles);
    $("#number_sendWS").on("input", (e) => {
      let btn = $("#btn_sendTicketWS");
      const msg = btn.attr("msg");
      let phone = e.target.value.length > 0 ? `phone=58${e.target.value}&` : "";
      btn.attr("href", `https://api.whatsapp.com/send?${phone}text=${msg}`);
    });

    let xsorteos = $sorteos.reduce((previous, current) => {
      if (previous.length > 0) {
        let last = previous[previous.length - 1];
        if (last.sorteo.sorteo != current.sorteo)
          previous.push({
            sorteo: cloneTo(current),
            sorteos: [cloneTo(current)],
          });
        else last.sorteos.push(cloneTo(current));
      } else
        previous.push({
          sorteo: cloneTo(current),
          sorteos: [cloneTo(current)],
        });
      return previous;
    }, []);
    //TODO: filtrar sorteos cerrados correctamente
    xsorteos = xsorteos.filter((s) => {
      return s.sorteo.abierta == true;
    });
    xsorteos.forEach((srt) => {
      srt.sorteo.descripcion = srt.sorteo.descripcion.replace(
        /\d{2}[APM]+/,
        ""
      );
      srt.sorteo.descripcion = srt.sorteo.descripcion.replace(
        /\d{1,2}:\d{1,2}[ APM]+/,
        ""
      );
      srt.sorteos.sort((a, b) => a.cierra - b.cierra);
    });
    const regHorario = /\d{1,2}[AMP]+|\d{1,2}:\d{2}[AMP ]+/;
    xsorteos = xsorteos.sort((a, b) => {
      if (a.sorteo.descripcion < b.sorteo.descripcion) return -1;
      else if (b.sorteo.descripcion < a.sorteo.descripcion) return 1;
      else return 0;
    });
    $(".md-sorteos-body").html(
      jsrender($("#rd-md-sorteos"), xsorteos, {
        horario: (desc) => {
          return regHorario.exec(desc)[0];
        },
      })
    );
    $(".sorteos-hub-btn").click(() => {
      let sorteosElegidos = [];
      $(".sorteo-hub-item").each((index, item) => {
        const isCheck = $(item).is(":checked");
        if (isCheck) {
          sorteosElegidos.push($(item).attr("sorteo"));
        }
      });
      sorteos.select2("val", sorteosElegidos);
      $("#md-sorteos").modal("hide");
    });
    $(".srt-hub-padre").change(function () {
      const isCheck = $(this).is(":checked");
      const sorteo = $(this).attr("sorteo");
      $(`.srt-hub-${sorteo}`).prop("checked", isCheck);
    });
    $("#sorteosHub").click((e) => {
      e.preventDefault();
      $("#md-sorteos").modal("show");
    });

    //#region formato impresion
    var formatoImpresion = config.formatoImpresion || 0;
    if (formatoImpresion > 0) {
      if (formatoImpresion == 1)
        $("#printbtn").html('<i class="fa fa-envelope"></i> ENVIAR');
      if (formatoImpresion == 2)
        $("#printbtn").html('<i class="fa fa-mobile-phone"></i> ENVIAR');
      if (formatoImpresion == 4)
        $("#printbtn").html('<i class="fa fa-file"></i> IMPRIMIR');
    } else if (formatoImpresion < 0) {
      $("#print-group").html(jsrender($("#print-select")));

      $("#print-paper").click(function (e) {
        e.preventDefault(e);
        formatoImpresion = 0;
        $("#print-label").html('<i class="fa fa-print"></i> IMPRIMIR');
        cesto_realizarVenta();
      });
      $("#print-mail").click(function (e) {
        e.preventDefault(e);
        formatoImpresion = 1;
        $("#print-label").html('<i class="fa fa-envelope"></i> ENVIAR');
        srqag.modal();
      });
      $("#print-pdf").click(function (e) {
        e.preventDefault(e);
        formatoImpresion = 4;
        $("#print-label").html('<i class="fa fa-file"></i> IMPRIMIR');
        //print pdf
        cesto_realizarVenta({
          pdf: true,
        });
      });
      $("#print-pantalla").click(function (e) {
        e.preventDefault(e);
        formatoImpresion = 5;
        $("#print-label").html('<i class="fa fa-desktop"></i> IMPRIMIR');
        //print pdf
        cesto_realizarVenta({
          pantalla: true,
        });
      });
      $("#print-ws").click(function (e) {
        e.preventDefault(e);
        formatoImpresion = 3;
        $("#print-label").html('<i class="fa fa-whatsapp"></i> ENVIAR');
        srqag.modal();
      });
    }

    //#endregion

    //ticketPendiente
    if (localStorage.getItem("lastTk")) {
      var ltk = JSON.parse(localStorage.getItem("lastTk"));
      var ltotal = 0;
      for (var i = 0; i < ltk.length; i++) {
        ltotal += ltk[i].monto;
      }
      localStorage.removeItem("lastTk");
      notificacion(
        "TICKET PENDIENTE",
        "Posiblemente el ultimo ticket enviado por <b>" +
          ltotal.format(2) +
          "bs</b>, no se confirmo. </br>Por favor proceda a verificar.",
        null,
        true
      );
    }

    if (!$("body").hasClass("leftpanel-collapsed")) {
      $(".menutoggle").trigger("click");
    }

    $(".s2a").select2({
      openOnEnter: false,
    });

    nav.paginas.addListener(Navegador.EXIT, exitPage);

    function exitPage(e) {
      nav.paginas.removeListener(Navegador.EXIT, exitPage);
      $(document).off("keydown", onKeyboardDown);
    }

    $("#taq-nombre").html($usuario.nombre);
    var cesto = [];
    var num = $("#vnt-numeros");
    var sorteos = $("#vnt-sorteos");
    sorteos.on("change", (e) => {
      let triples = false;
      for (let i = 0; i < e.val.length; i++) {
        const sorteoID = e.val[i];
        const sorteo = $sorteos.find((sorteo) => sorteo.sorteoID == sorteoID);
        if (sorteo) {
          if (sorteo.descripcion.indexOf("TRIPLE") >= 0) {
            triples = true;
            break;
          }
        }
      }
      if (triples) {
        triplesAcciones.removeClass("hidden");
        $("#terminal-marca-group").removeClass("hidden");
      } else {
        triplesAcciones.addClass("hidden");
        $("#terminal-marca-group").addClass("hidden");
        triplesConTerminal.prop("checked", false);
      }
    });
    var monto = $("#vnt-monto");
    var total = $("#vnt-total");
    var btnImprimir = $("#vnt-btn");
    var _ultimoTicket;
    var helper = {
      pleno: function (numID, srt) {
        const elemento = getElemento(numID, srt);
        return "#" + elemento.d;
      },
      num: function (n, sorteo) {
        return getElemento(n, sorteo).n;
      },
      sorteo: function (sorteo) {
        var s = findBy("sorteoID", sorteo, $sorteos);
        return s.descripcion;
      },
      formatn: formatNumber,
    };

    var srqag = $("#md-srqag"),
      srqag_s2 = $("#srag-input");
    var srqag_data = storage.getItem("srqag.agenda")
      ? JSON.parse(storage.getItem("srqag.agenda"))
      : [
          {
            n: "",
            v: "",
          },
        ];
    srqag_s2.html(jsrender($("#rd-srqag-item"), srqag_data));

    srqag.on("shown.bs.modal", function (e) {
      $("#srag-input").select2("focus");
      srqag.on("keydown", srqag_handler);
      $(document).off("keydown", onKeyboardDown);
    });
    srqag.on("hide.bs.modal", function (e) {
      srqag.off("keydown", srqag_handler);
      $(document).on("keydown", onKeyboardDown);
    });
    srqag.on("send", () => {
      alert("enviando venta por...");
    });
    $("#srqag-nuevo").submit(function (e) {
      $(".srqag-ferror").addClass("hidden");
      e.preventDefault(e);
      var data = formControls(this);
      var existe = findIndex("v", data.valor, srqag_data);
      if (existe > -1) {
        $("#srqag-existeh").removeClass("hidden");
        return;
      }
      var valid = 0;
      if (validateMail(data.valor)) valid++;
      if (parseInt(data.valor)) valid++;
      if (valid > 0) {
        srqag_data.push({
          n: data.nombre,
          v: data.valor,
        });
        srqag_data.sort(function (a, b) {
          return a.n.localeCompare(b.n);
        });
        srqag_s2.html(jsrender($("#rd-srqag-item"), srqag_data));
        formReset(this);
        srqag_s2.select2("focus");
        storage.setItem("srqag.agenda", JSON.stringify(srqag_data));

        $("#srqag-mailg").removeClass("has-error");
        $("#srqag-to").addClass("hidden");
        $("#srqag-existeh").addClass("hidden");
      } else {
        $("#srqag-mailg").addClass("has-error");
        $("#srqag-to").removeClass("hidden");
      }
    });
    $("#srqag-rem").click(function (e) {
      e.preventDefault(e);
      var i = srqag_s2.prop("selectedIndex");
      srqag_data.splice(i, 1);
      storage.setItem("srqag.agenda", JSON.stringify(srqag_data));
      srqag_s2.html(jsrender($("#rd-srqag-item"), srqag_data));
      srqag_s2.select2("val", "");
    });
    // METHODS
    $("#md-enviar-ok").click(validateEmailPhone);

    function srqag_handler(e) {
      if (e.which == parseInt(config.imprimirTecla)) {
        e.preventDefault(e);
        setTimeout(function () {
          validateEmailPhone();
        }, 100);
      }
      if (e.which == 107) {
        e.preventDefault(e);
        $("#srqag-nombre").focus();
      }
    }

    function validateEmailPhone() {
      var v = $("#srag-input").val();
      var evt = srqag.attr("evt") || "imprimir";
      srqag.removeAttr("evt");
      if (formatoImpresion == 1) {
        if (validateMail(v)) {
          if (evt == "reimprimir")
            srqag.trigger(evt, {
              tipo: "mail",
              numero: v,
            });
          else
            cesto_realizarVenta({
              mail: v,
            });
          srqag.modal("hide");
        } else alert("CORREO INVALIDO");
      }
      if (formatoImpresion == 3) {
        v = parseFloat(v).toString();
        if (v.length == 10) v = "58" + v;
        if (validatePhone(v)) {
          if (evt == "reimprimir")
            srqag.trigger(evt, {
              tipo: "ws",
              numero: v,
            });
          else
            cesto_realizarVenta({
              wsc: v,
            });
          srqag.modal("hide");
        } else alert("TELEFONO INVALIDO");
      }
    }

    function cesto_realizarVenta(meta) {
      if (cesto.length == 0) return;
      if (cesto.length > $meta.vnt_max_numtkt) {
        notificacion(
          "Limite de numeros exedido",
          "Ha exedido el tope limite de numeros permitidos por ticket, comuniquese con su administrador.",
          "growl-danger"
        );
        return;
      }
      //validar minimos
      var mtt = 0;
      for (var i = 0; i < cesto.length; i++) {
        mtt += cesto[i].monto;
        if (cesto[i].monto < $meta.vnt_min_num) {
          var num = findBy("id", cesto[i].numero, $elementos);
          notificacion(
            "MONTO MINIMO NUMERO",
            "No es posible procesar la venta, el monto asignado al #" +
              num.n +
              " " +
              num.d +
              " no cumple con el minimo requerido (" +
              formatNumber($meta.vnt_min_num, 2) +
              ") por su banca"
          );
          return;
        }
      }
      if (mtt < $meta.vnt_min_tkt) {
        notificacion(
          "MONTO MINIMO TICKET",
          "No es posible procesar la venta, el monto total del ticket (" +
            mtt +
            ") no cumple con el minimo requerido por su banca (" +
            formatNumber($meta.vnt_min_tkt, 2) +
            ")"
        );
        return;
      }

      if (vendiendo) {
        notificacion(
          '<i class="fa fa-hand-stop-o"></i> ESPERE.. VENTA EN PROCESO.'
        );
        return;
      }

      if (!meta) {
        if (formatoImpresion == 1 || formatoImpresion == 3) {
          srqag.modal();
          return;
        } else if (formatoImpresion == -1) {
          $("#printbtn").click();
          return;
        }
      }

      if (formatoImpresion == 0 && canPrint == false) {
        notificacion(
          "ASISTENTE IMPRESION",
          jsrender($("#rd-print-alert")),
          "growl-danger"
        );
        return;
      }

      vendiendo = true;
      btnImprimir.prop("disabled", vendiendo);
      storage.setItem("lastTk", JSON.stringify(cesto));

      socket.sendMessage(
        "venta",
        {
          m: meta || {},
          v: cesto,
        },
        ventaHandler
      );

      function ventaHandler(e, d) {
        vendiendo = false;
        storage.removeItem("lastTk");
        btnImprimir.prop("disabled", vendiendo);
        if (d.hasOwnProperty("code")) {
          if (d.code == 5)
            notificacion("SORTEOS INV�LIDOS", sorteosInvalidos(d.sorteos));
          else if (d.code == 6) {
            notificacion("TOPE TAQUILLA EXEDIDO", topeExedido(d.elementos));
            d.elementos.forEach(ajustarAtope);
            cesto_updateView();
          } else if (d.code == 7) {
            notificacion("TOPE ANIMAL EXEDIDO", topeExedido(d.elementos));
            d.elementos.forEach(ajustarAtope);
            cesto_updateView();
          } else if (d.code == 101) {
            notificacion(
              "VENTA CONFIRMADA",
              "TICKET: #" +
                d.tk.ticketID +
                "<br/><small>CODIGO: " +
                d.tk.codigo +
                "</small>"
            );
            cesto_reiniciar();
          } else if (d.code == 4) {
            let uid = new Date().getTime();
            notificacion(
              "TICKET POSIBLEMENTE DUPLICADO",
              `<p><b>Venta no confirmada</b><br>. En el ultimo minuto se ha vendido un ticket con caracteristicas muy parecidas al actual.</p>
                        <p>¿Confirma que desea realizar esta venta?</p>
                        <button id="vnt-confirmar${uid}" class="btn btn-success btn-block">Confirmar</button>`
            );
            $("#vnt-confirmar" + uid).click(function (e) {
              $(this).closest(".gritter-item-wrapper").remove();
              d.venta.m.rw = true;
              socket.sendMessage("venta", d.venta, ventaHandler);
            });
          } else notificacion("TICKET RECHAZADO");
          return;
        }
        notificacion(
          "VENTA CONFIRMADA",
          "TICKET: #" +
            d.tk.ticketID +
            "<br/><small>CODIGO: " +
            d.tk.codigo +
            "</small>"
        );
        //imprimirTicket
        if (d.format == "print") {
          if (formatoImpresion == 0) cesto_imprimir(d);
          else if (formatoImpresion == 4) cesto_pdf(d);
          else if (formatoImpresion == 5) cesto_digital(d);
        } else cesto_enviado(d);
        cesto_reiniciar();
      }
    }

    function ajustarAtope(item) {
      cesto.forEach(function (c) {
        if (c.sorteoID == item.s && c.numero == item.n) {
          c.monto = item.tm || item.td;
          c.tpte = true;
          if (c.monto == 0) {
            cesto.splice(cesto.indexOf(c), 1);
          }
        }
      });
    }

    function ultimoTicket(ticket) {
      _ultimoTicket = ticket;
      $("#tk-last").html(ticket.ticket.ticketID);
    }

    function cesto_enviado(d) {
      try {
        if (d.vt.length != cesto.length) {
          alert(
            "ALERTA: VERIFICAR TICKET, PUEDEN HABER CAMBIOS REALIZADOS POR EL SERVIDOR"
          );
        }
        for (var idx = 0; idx < d.vt.length; idx++) {
          d.vt[idx].sorteo = getSorteo(d.vt[idx].sorteoID).descripcion;
        }

        ultimoTicket({
          ticket: d.tk,
          ventas: d.vt,
        });
      } catch (err) {
        alert(
          "SRQ HA DETECTADO UN ERROR, Por favor notificar a su administrador. ERROR: " +
            err.message
        );
        $("#vnt-ultimo").trigger("click");
      }
    }

    function cesto_pdf(d) {
      for (var idx = 0; idx < d.vt.length; idx++) {
        d.vt[idx].sorteo = getSorteo(d.vt[idx].sorteoID).descripcion;
      }

      ultimoTicket({
        ticket: d.tk,
        ventas: d.vt,
      });

      imprimirVentas_pdf(d.vt, d.tk);
    }

    function cesto_imprimir(d) {
      try {
        if (d.vt.length != cesto.length) {
          alert(
            "ALERTA: VERIFICAR TICKET, PUEDEN HABER CAMBIOS REALIZADOS POR EL SERVIDOR"
          );
        }
        for (var idx = 0; idx < d.vt.length; idx++) {
          d.vt[idx].sorteo = getSorteo(d.vt[idx].sorteoID).descripcion;
        }

        ultimoTicket({
          ticket: d.tk,
          ventas: d.vt,
        });

        //imprimir
        var modoImpresion = config.modoImpresion || 1;
        //modo auto
        if (modoImpresion == "atm") modoImpresion = d.vt.length > 6 ? 2 : 1;
        _printStack[modoImpresion](d.vt, d.tk);
      } catch (err) {
        alert(
          "SRQ HA DETECTADO UN ERROR, Por favor notificar a su administrador. ERROR: " +
            err.message
        );
        $("#vnt-ultimo").trigger("click");
      }
    }

    function cesto_digital(d) {
      for (var idx = 0; idx < d.vt.length; idx++) {
        d.vt[idx].sorteo = getSorteo(d.vt[idx].sorteoID).descripcion;
      }
      ultimoTicket({
        ticket: d.tk,
        ventas: d.vt,
      });

      var texto = imprimirVentas_digital(d.vt, d.tk);
      $("#md-ticket-text").val(texto);
      $("#md-copy-ticket").modal();
      setTimeout(() => {
        copiarAPortapapeles();
      }, 200);

      let msg = texto.split("\n").join("%0a");

      $("#btn_sendTicketWS").attr(
        "href",
        `https://api.whatsapp.com/send?text=${msg}`
      );
      $("#btn_sendTicketWS").attr("msg", msg);
    }

    function cesto_reiniciar() {
      cesto.length = 0;
      num.focus();
      cesto_updateView(); //TODO optimizar
    }

    function cesto_updateView() {
      cesto.sort(function (a, b) {
        var s1 = a.sorteoID,
          s2 = b.sorteoID;
        var n1 = a.numero,
          n2 = b.numero;
        return s1 == s2 ? n1 - n2 : s1 - s2;
      }); //ordenarlas por sorteo
      $("#vnt-cesta").html(jsrender($("#rd-cesta-row"), cesto, helper));

      $(".rem-cesto").click(function (e) {
        e.preventDefault(e);
        var idx = parseInt($(e.currentTarget).attr("indice"));
        cesto.splice(idx, 1);
        cesto_updateView();
      });
      var tt = 0;
      cesto.forEach(function (venta) {
        tt += parseFloat(formatNumber(venta.monto, 2, ".", ""));
      });
      total.html(tt.format(2));
      total.attr("datan", tt.format(2, ".", ""));
      cesto.forEach(function (c) {
        delete c.tpte;
      });
    }

    function sorteos_updateView() {
      if (config.ordenSorteos == 0) $sorteos.sort(sorteos_ordenSorteo);
      else $sorteos.sort(sorteos_ordenCierre);
      sorteos.html(
        jsrender(
          $("#rd-sorteo-option"),
          $sorteos.filter(sorteosDisponibles_filtro)
        )
      );
    }

    function sorteos_ordenSorteo(a, b) {
      var s1 = a.sorteo,
        s2 = b.sorteo;
      var n1 = a.cierra,
        n2 = b.cierra;
      return s1 == s2 ? n1 - n2 : s1 - s2;
    }

    function sorteos_ordenCierre(a, b) {
      var n1 = a.cierra,
        n2 = b.cierra;
      return n1 - n2;
    }

    function elementoCesto(sorteo, numero) {
      for (var i = 0; i < cesto.length; i++) {
        if (cesto[i].sorteoID == sorteo && cesto[i].numero == numero) return i;
      }
      return -1;
    }

    function elementoSorteo(sorteo, numero) {
      return new Promise((resolve, reject) => {
        numero = numero != "00" ? parseInt(numero) : numero;
        const numeros = $elementos[sorteo];
        if (!numeros) {
          recargarElementosSync().then(() => {
            elementoSorteo(sorteo, numero).then((id) => {
              resolve(id);
            });
          });
        } else {
          const elemento = numeros.find((num) => {
            return num === numero || num.n == numero;
          });
          if (!elemento)
            notificacion(
              `El numero ${numero} no esta registrado, favor ingrese un numero valido.`
            );
          else resolve(elemento.id);
        }
      });
    }

    function recargarElementosSync() {
      return new Promise((resolve) => {
        function recarga_complete(e, d) {
          if (d.hasOwnProperty("hash")) {
            socket.removeListener(e, recarga_complete);
            resolve();
          }
        }
        socket.addListener("elementos-init", recarga_complete);
        elementosRecibidos = {};
        socket.sendMessage("elementos-init");
      });
    }

    //UI HANDLERES
    $("#todoElDia").click(function todoElDia_handler(e) {
      e.preventDefault();
      let sorteosElegidos = sorteos.select2("val");
      if (sorteosElegidos.length > 1)
        return notificacion(
          "Esta funcion solo permite tomar un sorteo como referencia"
        );

      let sorteo = findBy("sorteoID", sorteosElegidos[0], $sorteos);
      let sorteosSimilares = exploreBy("sorteo", sorteo.sorteo, $sorteos).map(
        (item) => {
          return item.sorteoID;
        }
      );
      sorteos.select2("val", sorteosSimilares).trigger("change");
      num.select2("focus");
    });
    $("#vnt-clr").click(cesto_reiniciar);
    btnImprimir.click(function () {
      cesto_realizarVenta();
    });
    $("#vnt-venta").submit(function (e) {
      e.preventDefault(e);
      var data = formControls(this);
      if (data.monto == "" || data.monto === 0) {
        monto.focus();
        return;
      }
      if (typeof data.numero != "object") {
        data.numero = data.numero.trim();
        data.numero = data.numero.replace(/^[\D]+/g, "");
        data.numero = data.numero.replace(/[^\/\d]+/g, " ");
        data.numero = data.numero.replace(/[\D]+$/g, "");
        data.numero = data.numero.split(" ");
        //corrida
        for (var i = data.numero.length - 1; i >= 0; i--) {
          if (data.numero[i].indexOf("/") > -1) {
            var parts = data.numero[i].split("/");
            parts.sort(function (a, b) {
              return parseInt(a) - parseInt(b);
            });
            data.numero.splice(i, 1);
            var a = parseInt(parts[0]),
              b = parseInt(parts[1]);
            var ix = i;
            for (var n = a; n <= b; n++) {
              data.numero.splice(ix++, 0, padding(n, 1));
            }
          }
        }
        //corrida
      }

      for (let nindex = 0; nindex < data.numero.length; nindex++) {
        let numero = data.numero[nindex];
        var n = parseInt(numero);
        if (n > 0 && n < 10) numero = "0" + n;
        if (!data.sorteos)
          return notificacion(
            "SELECCIONE AL MENOS UN (1) SORTEO",
            "",
            "growl-danger"
          );

        const terminal = triplesConTerminal.is(":checked");
        for (let sindex = 0; sindex < data.sorteos.length; sindex++) {
          const sorteo = data.sorteos[sindex];
          const srt = findBy("sorteoID", sorteo, $sorteos);

          if (srt.zodiacal == 0) {
            elementoSorteo(srt.sorteo, numero).then((num) => {
              if (num > -1) {
                addNum(num, sorteo, numero);
                if (terminal)
                  asignarTerminales(numero, srt).then(actualizarCesto);
                else actualizarCesto();
              }
            });
          } else {
            //zodiacal
            var zs = vntzodiaco.select2("val");
            if (zs.length > 0) {
              var i;
              if (zs.indexOf("TODOS") > -1) {
                zs = new Array(zdata.length);
                for (i = 1; i < zdata.length; i++) zs[i] = zdata[i].zID;
              }
              for (i = 0; i < zs.length; i++) {
                num = elementoSorteo(srt.sorteo, numero + zs[i]);
                addNum(num, sorteo, numero);
              }
            } else {
              num = elementoSorteo(srt.sorteo, numero);
              addNum(num, sorteo, numero);
            }
          }
        }
      }
      function asignarTerminales(numero, sorteo) {
        return new Promise((resolve, reject) => {
          if (sorteo.descripcion.indexOf("TRIPLE") > -1) {
            const desc = sorteo.descripcion.replace("TRIPLE", "TERMINAL");
            const sorteoTerminal = $sorteos.find(
              (sorteo) => sorteo.descripcion == desc
            );
            if (sorteoTerminal) {
              numero = formatoTriple(numero).substr(1);
              elementoSorteo(sorteoTerminal.sorteo, numero).then((num) => {
                addNum(num, sorteoTerminal.sorteoID, numero);
                resolve();
              });
            } else resolve();
          } else resolve();
        });
      }
      function addNum(num, sorteo) {
        if (num > -1) {
          var idx = elementoCesto(sorteo, num);
          if (idx > -1) cesto[idx].monto += data.monto;
          else {
            cesto.push({
              numero: num,
              monto: data.monto,
              sorteoID: sorteo,
            });
          }
        }
      }
      function actualizarCesto() {
        cesto_updateView();

        num.val(null).trigger("change");
        if (p == "venta") num.select2("focus");
        else $(num).focus();
        //$('#vnt-monto').val('');
      }
    });

    sorteos.on("change", function (e) {
      if (sorteos.select2("val").length == 1) {
        $("#todoElDia").removeClass("hidden");
      } else $("#todoElDia").addClass("hidden");
      var s = null;
      if (e.val && e.val.length > 0) {
        s = findBy("sorteoID", e.val[0], $sorteos);
        for (var i = 1; i < e.val.length; i++) {
          if (s.sorteo != findBy("sorteoID", e.val[i], $sorteos).sorteo) {
            s = null;
            break;
          }
        }
      }
      if (s) {
        var el = exploreBy("s", s.sorteo, $elementos);
        num.html(jsrender($("#rd-elemento-sorteo-option"), el));
      } else {
        num.html(jsrender($("#rd-elemento-option"), $numeros));
      }
      num.select2("val", null).trigger("change");

      var z = $("#fg-zodiaco");
      z.addClass("hidden");
      let valores = e.val ? e.val : sorteos.select2("val");
      valores.forEach(function (item) {
        var s = findBy("sorteoID", item, $sorteos);
        if (s.zodiacal == 1) {
          z.removeClass("hidden");
          return;
        }
      });
    });
    $("#vnt-dia").click(function (e) {
      var d = new Date($servidor.hora);
      nav.url("reporte/diario", [d.format()]);
    });
    $(".vnt-reimprimir").click(function (e) {
      e.preventDefault(e);
      formatoImpresion = $(this).attr("formato");
      if (canPrint == false && formatoImpresion == "0") {
        grt = notificacion(
          "ASISTENTE IMPRESION",
          jsrender($("#rd-print-alert")),
          "growl-danger",
          true
        );
        $(".print-rcn").off("click", onPrint);
        $(".print-rcn").on("click", onPrint);
        return;
      }
      socket.sendMessage("venta-ultima", null, ultimaVenta);

      function ultimaVenta(e, d) {
        if (!d.ventas) return;
        var srt;
        d.ventas.forEach(function (venta) {
          venta.ventaID = padding(venta.ventaID, 6);
          srt = getSorteo(venta.sorteoID);
          if (srt) venta.srt = srt.descripcion;
        });
        ultimoTicket(d);

        if (formatoImpresion == 0) {
          var modoImpresion = config.modoImpresion || 1;
          if (modoImpresion == "atm")
            modoImpresion = _ultimoTicket.ventas.length > 6 ? 2 : 1; //modo auto
          _printStack[modoImpresion](
            _ultimoTicket.ventas,
            _ultimoTicket.ticket,
            true
          );
        } else if (formatoImpresion == 4)
          imprimirVentas_pdf(d.ventas, d.ticket);
        else if (formatoImpresion == 3) {
          srqag.attr("evt", "reimprimir");
          srqag.on("reimprimir", (e, data) => {
            srqag.off("reimprimir");
            if (data.tipo === "ws")
              imprimirVentas_ws(data.numero, d.ventas, d.ticket, true);
          });
          srqag.modal();
        }
      }
    });
    $("#ultventa-udp").click(function (e) {
      e.preventDefault(e);
      $("#tk-last").html('<i class="fa fa-spinner fa-spin"></i>');
      socket.sendMessage("venta-ultima", null, ultimaVenta);
    });
    $("#vnt-repetir").submit(function (e) {
      e.preventDefault(e);
      var data = formControls(this);
      cesto.length = 0;
      var srt, num;
      for (var i = 0; i < data.numero.length; i++) {
        srt = findBy("sorteoID", data.sorteo[i], $sorteos);
        num = elementoSorteo(srt.sorteo, data.numero[i]);
        if (num > -1) {
          cesto.push({
            numero: num,
            monto: data.monto[i],
            sorteoID: data.sorteo[i],
          });
        } else
          notificacion(
            "NUMERO INVALIDO",
            "El numero #" +
              data.numero[i] +
              " NO EXISTE EN SORTEO SELECCIONADO",
            "growl-danger"
          );
      }
      cesto_updateView();
      $("#md-repetir").modal("hide");
    });
    var _cacherpt;
    $("#repetir").submit(function (e) {
      e.preventDefault(e);
      var data = formControls(this);
      var f = formLock(this);
      socket.sendMessage("venta-repetir", data, function (e, d) {
        formReset(f);
        _cacherpt = d;
        d[0].h = 1;
        for (var i = 1; i < d.length; i++) {
          if (d[i].sorteoID != d[i - 1].sorteoID) d[i].h = 1;
        }
        $("#vnt-repetir").html(jsrender($("#rd-repetir"), d, helper));
        $("#md-repetir").modal("show");
      });
    });
    $("#md-repetir").on("shown.bs.modal", function (e) {
      var disponibles = $sorteos.filter(sorteosDisponibles_filtro);
      disponibles = disponibles.sort(sorteos_ordenSorteo);
      var s = $(".s2sorteos");
      s.html(jsrender($("#rd-sorteo-option"), disponibles));
      select2w(s);

      var rptplus = $(".rpt-plus");
      var rptminus = $(".rpt-minus");

      disponibles.forEach(function (item, index) {
        $(".srt" + item.sorteoID).select2("val", item.sorteoID);
      });

      /*var mdSorteos = $('#md-msorteos');
      mdSorteos.html(jsrender($('#rd-sorteo-option'),disponibles));*/

      rptplus.click(function () {
        var sid = parseInt($(this).attr("sorteo"));
        var n = _cacherpt.length;
        var srt = $("select.srt" + sid);
        srt.each(function (index, val) {
          var el = $(this);
          var v = el.val();
          var idx = findIndex("sorteoID", v, disponibles);
          if (idx < disponibles.length - 1)
            el.prop("selectedIndex", idx + 1).change();
        });
      });
      rptminus.click(function () {
        var sid = parseInt($(this).attr("sorteo"));
        var n = _cacherpt.length;
        var srt = $("select.srt" + sid);
        srt.each(function (index, val) {
          var el = $(this);
          var v = el.val();
          var idx = findIndex("sorteoID", v, disponibles);
          if (idx > 0) el.prop("selectedIndex", idx - 1).change();
        });
      });
    });
    sorteos_updateView();

    num.html(jsrender($("#rd-elemento-option"), $numeros));
    sorteos.select2("focus");

    var numInput, sorteoInput;
    $(".select2-input").each(function (index) {
      if (index == 1) numInput = this.id;
      if (index == 0) sorteoInput = this.id;
    });
    $(document).on("keydown", onKeyboardDown);
    $(document).on("keydown", numInput_keyDown);
    function numInput_keyDown(e) {
      if (e.altKey) {
        //tecla P
        if (e.which == 80) {
          e.preventDefault(e);
          const nm = num.val();
          const numeros = permutar(nm);
          num.val(numeros.join(" "));
        }
        //tecla S
        if (e.which == 83) {
          e.preventDefault(e);
          const nm = num.val();
          const numeros = crearSerie(nm);
          num.val(numeros.join(" "));
        }
        //tecla c
        if (e.which == 67) {
          e.preventDefault(e);
          const nm = num.val();
          const numeros = crearCorrida(nm);
          num.val(numeros.join(" "));
        }
        if (e.which == 84) {
          e.preventDefault(e);
          const terminal = $("#terminales-marca");
          const isCheck = terminal.is(":checked");
          terminal.prop("checked", !isCheck);
        }
      }
    }

    function onKeyboardDown(e) {
      if (e.altKey) {
        //num.focus();
        if (e.which >= 96 && e.which <= 105) {
          e.preventDefault(e);
          var n = e.which - 96;
          cesto.splice(n - 1, 1);
          cesto_updateView();
        }
      }
      if (e.ctrlKey) {
        if (e.which == 88) {
          $("#md-anularTicket").modal();
        }
      }
      switch (e.which) {
        case 13: {
          if (e.target.id == numInput || e.target.id == "vnt-numeros") {
            e.preventDefault(e);
            num.select2("close");
            monto.focus();
            monto.select();
          } else if (e.target.id == sorteoInput) {
            e.preventDefault(e);
            sorteos.select2("close");
            num.select2("open");
            num.focus();
          }
          break;
        }
        case parseInt(config.imprimirTecla): {
          // NUMPAD +
          e.preventDefault(e);
          cesto_realizarVenta();
          sorteos.select2("close");
          break;
        }
        case 109: {
          // NUMPAD -
          e.preventDefault(e);
          if (cesto.length > 0) {
            cesto.pop();
            cesto_updateView();
          } else {
            num.select2("close");
            sorteos.val(null).trigger("change");
            sorteos.select2("open");
          }
          break;
        }
        case 36: {
          //FIN
          e.preventDefault(e);
          if (e.target.id == numInput) {
            num.select2("close");
            monto.focus();
            monto.select();
          } else if (e.target.id == sorteoInput) {
            sorteos.select2("close");
            num.select2("open");
            num.focus();
          } else {
            sorteos.select2("open");
            sorteos.focus();
          }
          break;
        }
      }
    }

    var _printStack = [
      imprimirVentas,
      imprimirVentas_comp,
      imprimirVentas_ultra,
      imprimirVentas_extremo,
      imprimirVentas_comprobante,
    ];

    function prepararTicketVenta(ticket) {
      if (config.nombreCliente == 1) {
        let nombre = prompt("Nombre del cliente");
        nombre = nombre.trim().substr(0, 10).toLowerCase();
        ticket.cliente = nombre;
      }
      return ticket;
    }

    function imprimirVentas(cesto, ticket, copia) {
      prepararTicketVenta(ticket);
      copia = copia || false;
      var _lineas = [
        {
          type: "linea",
          text: $usuario.nombre,
          align: "center",
        },
        {
          type: "linea",
          text: ticket.hora,
          align: "center",
        },
      ];
      if (copia) {
        _lineas.push({
          type: "linea",
          text: "S:" + padding(ticket.ticketID, 6) + " N:" + cesto.length,
          align: "center",
        });
      } else {
        _lineas.push({
          type: "linea",
          text:
            "S:" +
            padding(ticket.ticketID, 6) +
            " C:" +
            padding(ticket.codigo) +
            " N:" +
            cesto.length,
          align: "center",
        });
      }
      _lineas.push({
        type: "linea",
        text: "TICKET - CADUCA 3 DIAS",
        align: "center",
      });

      cesto.sort(function (a, b) {
        var s1 = a.sorteoID,
          s2 = b.sorteoID;
        var n1 = a.numero,
          n2 = b.numero;
        return s1 == s2 ? n1 - n2 : s1 - s2;
      }); //ordenarlas por sorteo
      var linea = cesto[0],
        el;
      _lineas.push({
        type: "linea",
        text: linea.sorteo,
        align: "center",
      });
      for (var i = 0; i < cesto.length; i++) {
        if (linea.sorteoID != cesto[i].sorteoID) {
          _lineas.push({
            type: "linea",
            text: cesto[i].sorteo,
            align: "center",
          });
        }
        linea = cesto[i];
        el = getElemento(linea.num || linea.numero, linea.sorteoID);
        _lineas.push({
          type: "linea",
          text: ["#" + el.d, formatNumber(linea.monto, 0) + config.moneda].join(
            "\t "
          ),
          align: "center",
        });
      }

      _lineas.push({
        type: "linea",
        text:
          "T:" + ticket.monto.format(2) + config.moneda + " AG" + _fingerprint,
        align: "left",
      });
      //_lineas.push({type:"linea",text:"CADUCA EN 3 DIAS",align:"center"});
      if (ticket.cliente) {
        _lineas.push({
          type: "linea",
          text: `CLIENTE: ${ticket.cliente}`,
          align: "left",
        });
      }
      _lineas.push({
        type: "linea",
        text: " ",
        align: "left",
      });

      print.sendMessage("print", {
        data: _lineas,
        printer: 1,
      });
    }

    function imprimirVentas_pdf(cesto, ticket, copia) {
      prepararTicketVenta(ticket);
      copia = copia || false;
      var cl = 10,
        lheight = 8;

      function newline(text) {
        pdf.text(text, 10, cl);
        cl += lheight;
      }
      var pdf = new jsPDF();
      //print_comp
      var _lineas = [
        {
          type: "linea",
          text: $usuario.nombre.toUpperCase(),
          align: "center",
        },
        {
          type: "linea",
          text: ticket.hora,
          align: "center",
        },
      ];
      if (copia) {
        _lineas.push({
          type: "linea",
          text: "S:" + padding(ticket.ticketID, 6) + " N:" + cesto.length,
          align: "center",
        });
        _lineas.push({
          type: "linea",
          text: "COPIA - CADUCA 3 DIAS",
          align: "center",
        });
      } else {
        _lineas.push({
          type: "linea",
          text:
            "S:" +
            padding(ticket.ticketID, 6) +
            " C:" +
            padding(ticket.codigo) +
            " N:" +
            cesto.length,
          align: "center",
        });
        _lineas.push({
          type: "linea",
          text: "TICKET - CADUCA 3 DIAS",
          align: "center",
        });
      }

      cesto.sort(function (a, b) {
        var s1 = a.sorteoID,
          s2 = b.sorteoID;
        var n1 = a.numero,
          n2 = b.numero;
        return s1 == s2 ? n1 - n2 : s1 - s2;
      }); //ordenarlas por sorteo
      var linea = cesto[0],
        el;
      var ldata = [];
      var hdata = [];
      var lo = {},
        hi = 0,
        li = 0,
        ci = 1;
      //_lineas.push({type:"linea",text:linea.sorteo,align:"center"});
      hdata[hi] = [
        {
          field: "l1",
          text: linea.sorteo,
          width: "50",
        },
        {
          field: "l2",
          text: " ",
          width: "50",
        },
      ];
      ldata[li] = [];
      for (var i = 0; i < cesto.length; i++) {
        if (linea.sorteoID != cesto[i].sorteoID) {
          //_lineas.push({type:"linea",text:cesto[i].sorteo,align:"center"});
          if (ci == 2) ldata[li].push(lo);

          _lineas.push({
            type: "tabla",
            header: false,
            columns: hdata[hi++],
            data: ldata[li++],
          });

          hdata[hi] = [
            {
              field: "l1",
              text: cesto[i].sorteo,
              width: "50",
            },
            {
              field: "l2",
              text: " ",
              width: "50",
            },
          ];
          ldata[li] = [];

          ci = 1;
          lo = {};
        }
        linea = cesto[i];
        el = getElemento(linea.num || linea.numero, linea.sorteoID);
        if (ci == 2) {
          ci = 1;
          lo.l2 = el.d + " " + formatNumber(linea.monto, 0) + config.moneda;
          ldata[li].push(lo);
          lo = {};
        } else {
          ci = 2;
          lo.l1 = el.d + " " + formatNumber(linea.monto, 0) + config.moneda;
          lo.l2 = " ";
        }
      }
      if (ci == 2) ldata[li].push(lo);
      _lineas.push({
        type: "tabla",
        header: false,
        columns: hdata[hi++],
        data: ldata[li++],
      });

      _lineas.push({
        type: "linea",
        text:
          "T:" + ticket.monto.format(2) + config.moneda + " AG" + _fingerprint,
        align: "left",
      });
      if (ticket.cliente) {
        _lineas.push({
          type: "linea",
          text: `CLIENTE: ${ticket.cliente}`,
          align: "left",
        });
      }

      var ln;
      for (var l = 0; l < _lineas.length; l++) {
        ln = _lineas[l];
        if (ln.type == "linea") newline(ln.text);
        else if (ln.type == "tabla") {
          var col = ln.columns[0];
          newline(col.text);

          var body = ln.data;
          var bl;
          for (var bi = 0; bi < body.length; bi++) {
            bl = body[bi];
            var s = "";
            if (bl.hasOwnProperty("l1")) s += bl.l1 + "\t";
            if (bl.hasOwnProperty("l2")) s += bl.l2;
            newline(s);
          }
        }
      }

      pdf.save("SRQ-" + ticket.ticketID);
    }

    function imprimirVentas_digital(cesto, ticket, copia) {
      prepararTicketVenta(ticket);
      copia = copia || false;
      var _lineas = [
        {
          text: `*${$usuario.nombre}*`,
        },
        {
          text: ticket.hora,
        },
      ];
      if (copia) {
        _lineas.push({
          text: `S: *${padding(ticket.ticketID, 6)}* N:${cesto.length}`,
        });
        _lineas.push({
          text: "COPIA - CADUCA 3 DIAS",
        });
      } else {
        _lineas.push({
          text: `S: *${padding(ticket.ticketID, 6)}* C: *${padding(
            ticket.codigo
          )}* N:${cesto.length}`,
        });
        _lineas.push({
          text: "TICKET - CADUCA 3 DIAS",
        });
      }
      cesto.sort(function (a, b) {
        var s1 = a.sorteoID,
          s2 = b.sorteoID;
        var n1 = a.numero,
          n2 = b.numero;
        return s1 == s2 ? n1 - n2 : s1 - s2;
      }); //ordenarlas por sorteo

      var linea = cesto[0],
        el;
      var csorteo = [];
      for (var i = 0; i < cesto.length; i++) {
        if (linea.sorteoID != cesto[i].sorteoID) {
          _lineas.push({
            text: `*_${linea.sorteo}_*`,
          });
          csorteo.sort(cesto_ordenMonto);
          cesto_print(csorteo, _lineas);
          csorteo = [];
        }
        csorteo.push(cesto[i]);
        linea = cesto[i];
      }
      _lineas.push({
        text: `*_${linea.sorteo}_*:`,
      });
      csorteo.sort(cesto_ordenMonto);
      cesto_print(csorteo, _lineas);

      //_lineas.push({type:"linea",text:"TOTAL: "+ticket.monto,align:"center"});
      _lineas.push({
        text: `*TOTAL: ${ticket.monto.format(2) + config.moneda}*`,
      });
      if (ticket.cliente) {
        _lineas.push({
          type: "linea",
          text: `CLIENTE: ${ticket.cliente}`,
          align: "left",
        });
      }
      let msg = _lineas.map((item) => item.text);
      return msg.join("\n");
    }

    function imprimirVentas_comp(cesto, ticket, copia) {
      prepararTicketVenta(ticket);
      copia = copia || false;
      var _lineas = [
        {
          type: "linea",
          text: $usuario.nombre,
          align: "center",
        },
        {
          type: "linea",
          text: ticket.hora,
          align: "center",
        },
      ];
      if (copia) {
        _lineas.push({
          type: "linea",
          text: "S:" + padding(ticket.ticketID, 6) + " N:" + cesto.length,
          align: "center",
        });
        _lineas.push({
          type: "linea",
          text: "COPIA - CADUCA 3 DIAS",
          align: "center",
        });
      } else {
        _lineas.push({
          type: "linea",
          text:
            "S:" +
            padding(ticket.ticketID, 6) +
            " C:" +
            padding(ticket.codigo) +
            " N:" +
            cesto.length,
          align: "center",
        });
        _lineas.push({
          type: "linea",
          text: "TICKET - CADUCA 3 DIAS",
          align: "center",
        });
      }

      cesto.sort(function (a, b) {
        var s1 = a.sorteoID,
          s2 = b.sorteoID;
        var n1 = a.numero,
          n2 = b.numero;
        return s1 == s2 ? n1 - n2 : s1 - s2;
      }); //ordenarlas por sorteo
      var linea = cesto[0],
        el;
      var ldata = [];
      var hdata = [];
      var lo = {},
        hi = 0,
        li = 0,
        ci = 1;
      //_lineas.push({type:"linea",text:linea.sorteo,align:"center"});
      hdata[hi] = [
        {
          field: "l1",
          text: linea.sorteo,
          width: "50",
        },
        {
          field: "l2",
          text: " ",
          width: "50",
        },
      ];
      ldata[li] = [];
      for (var i = 0; i < cesto.length; i++) {
        if (linea.sorteoID != cesto[i].sorteoID) {
          //_lineas.push({type:"linea",text:cesto[i].sorteo,align:"center"});
          if (ci == 2) ldata[li].push(lo);
          _lineas.push({
            type: "tabla",
            header: false,
            columns: hdata[hi++],
            data: ldata[li++],
          });

          hdata[hi] = [
            {
              field: "l1",
              text: cesto[i].sorteo,
              width: "50",
            },
            {
              field: "l2",
              text: " ",
              width: "50",
            },
          ];
          ldata[li] = [];

          ci = 1;
          lo = {};
        }
        linea = cesto[i];
        el = getElemento(linea.num || linea.numero, linea.sorteoID);
        if (ci == 2) {
          ci = 1;
          lo.l2 =
            el.d.substr(0, 6) +
            " " +
            formatNumber(linea.monto, 0) +
            config.moneda;
          ldata[li].push(lo);
          lo = {};
        } else {
          ci = 2;
          lo.l1 =
            el.d.substr(0, 6) +
            " " +
            formatNumber(linea.monto, 0) +
            config.moneda;
          lo.l2 = " ";
        }
      }
      if (ci == 2) ldata[li].push(lo);
      _lineas.push({
        type: "tabla",
        header: false,
        columns: hdata[hi++],
        data: ldata[li++],
      });

      _lineas.push({
        type: "linea",
        text:
          "T:" + ticket.monto.format(2) + config.moneda + " AG" + _fingerprint,
        align: "left",
      });
      if (ticket.cliente) {
        _lineas.push({
          type: "linea",
          text: `CLIENTE: ${ticket.cliente}`,
          align: "left",
        });
      }
      _lineas.push({
        type: "linea",
        text: " ",
        align: "left",
      });

      print.sendMessage("print", {
        data: _lineas,
        printer: 1,
      });
    }

    function imprimirVentas_ultra(cesto, ticket, copia) {
      prepararTicketVenta(ticket);
      copia = copia || false;
      var _lineas = [
        {
          type: "linea",
          text: $usuario.nombre,
          align: "center",
        },
        {
          type: "linea",
          text: ticket.hora,
          align: "center",
        },
      ];
      if (copia) {
        _lineas.push({
          type: "linea",
          text: "S:" + padding(ticket.ticketID, 6) + " N:" + cesto.length,
          align: "center",
        });
        _lineas.push({
          type: "linea",
          text: "COPIA - CADUCA 3 DIAS",
          align: "center",
        });
      } else {
        _lineas.push({
          type: "linea",
          text:
            "S:" +
            padding(ticket.ticketID, 6) +
            " C:" +
            padding(ticket.codigo) +
            " N:" +
            cesto.length,
          align: "center",
        });
        _lineas.push({
          type: "linea",
          text: "TICKET - CADUCA 3 DIAS",
          align: "center",
        });
      }

      cesto.sort(function (a, b) {
        var s1 = a.sorteoID,
          s2 = b.sorteoID;
        var n1 = a.numero,
          n2 = b.numero;
        return s1 == s2 ? n1 - n2 : s1 - s2;
      }); //ordenarlas por sorteo
      var colw = 33;
      var linea = cesto[0],
        el;
      var ldata = [];
      var hdata = [];
      var lo = {},
        hi = 0,
        li = 0,
        ci = 1;
      //_lineas.push({type:"linea",text:linea.sorteo,align:"center"});
      hdata[hi] = [
        {
          field: "l1",
          text: linea.sorteo,
          width: colw,
        },
        {
          field: "l2",
          text: " ",
          width: colw,
        },
        {
          field: "l3",
          text: " ",
          width: colw,
        },
      ];
      ldata[li] = [];
      for (var i = 0; i < cesto.length; i++) {
        if (linea.sorteoID != cesto[i].sorteoID) {
          //_lineas.push({type:"linea",text:cesto[i].sorteo,align:"center"});
          if (ci < 4) ldata[li].push(lo);
          _lineas.push({
            type: "tabla",
            header: false,
            columns: hdata[hi++],
            data: ldata[li++],
          });

          hdata[hi] = [
            {
              field: "l1",
              text: cesto[i].sorteo,
              width: colw,
            },
            {
              field: "l2",
              text: " ",
              width: colw,
            },
            {
              field: "l3",
              text: " ",
              width: colw,
            },
          ];
          ldata[li] = [];

          ci = 1;
          lo = {};
        }
        linea = cesto[i];
        el = getElemento(linea.num || linea.numero, linea.sorteoID);
        if (ci == 3) {
          ci = 1;
          lo.l3 = [el.n + "x" + formatNumber(linea.monto, 0)].join("\t ");
          ldata[li].push(lo);
          lo = {};
        } else if (ci == 2) {
          ci++;
          lo.l2 = [el.n + "x" + formatNumber(linea.monto, 0)].join("\t ");
        } else {
          ci++;
          lo.l1 = [el.n + "x" + formatNumber(linea.monto, 0)].join("\t ");
          lo.l2 = " ";
          lo.l3 = " ";
        }
      }
      if (ci == 2 || ci == 3) ldata[li].push(lo);
      _lineas.push({
        type: "tabla",
        header: false,
        columns: hdata[hi++],
        data: ldata[li++],
      });

      _lineas.push({
        type: "linea",
        text:
          "T:" + ticket.monto.format(2) + config.moneda + " AG" + _fingerprint,
        align: "left",
      });
      if (ticket.cliente) {
        _lineas.push({
          type: "linea",
          text: `CLIENTE: ${ticket.cliente}`,
          align: "left",
        });
      }
      _lineas.push({
        type: "linea",
        text: " ",
        align: "left",
      });

      print.sendMessage("print", {
        data: _lineas,
        printer: 1,
      });
    }

    function imprimirVentas_extremo(cesto, ticket, copia) {
      prepararTicketVenta(ticket);
      copia = copia || false;
      var _lineas = [
        {
          type: "linea",
          text: $usuario.nombre,
          align: "center",
        },
        {
          type: "linea",
          text: ticket.hora,
          align: "center",
        },
      ];
      if (copia) {
        _lineas.push({
          type: "linea",
          text: "S:" + padding(ticket.ticketID, 6) + " N:" + cesto.length,
          align: "center",
        });
        _lineas.push({
          type: "linea",
          text: "COPIA - CADUCA 3 DIAS",
          align: "center",
        });
      } else {
        _lineas.push({
          type: "linea",
          text:
            "S:" +
            padding(ticket.ticketID, 6) +
            " C:" +
            padding(ticket.codigo) +
            " N:" +
            cesto.length,
          align: "center",
        });
        _lineas.push({
          type: "linea",
          text: "TICKET - CADUCA 3 DIAS",
          align: "center",
        });
      }

      cesto.sort(function (a, b) {
        var s1 = a.sorteoID,
          s2 = b.sorteoID;
        var n1 = a.numero,
          n2 = b.numero;
        return s1 == s2 ? n1 - n2 : s1 - s2;
      }); //ordenarlas por sorteo

      var linea = cesto[0],
        el;
      var csorteo = [];
      for (var i = 0; i < cesto.length; i++) {
        if (linea.sorteoID != cesto[i].sorteoID) {
          _lineas.push({
            type: "linea",
            text: linea.sorteo,
            align: "left",
          });
          csorteo.sort(cesto_ordenMonto);
          cesto_print(csorteo, _lineas);
          csorteo = [];
        }
        csorteo.push(cesto[i]);
        linea = cesto[i];
      }
      _lineas.push({
        type: "linea",
        text: linea.sorteo,
        align: "left",
      });
      csorteo.sort(cesto_ordenMonto);
      cesto_print(csorteo, _lineas);

      //_lineas.push({type:"linea",text:"TOTAL: "+ticket.monto,align:"center"});
      _lineas.push({
        type: "linea",
        text:
          "T:" + ticket.monto.format(2) + config.moneda + " AG" + _fingerprint,
        align: "left",
      });
      if (ticket.cliente) {
        _lineas.push({
          type: "linea",
          text: `CLIENTE: ${ticket.cliente}`,
          align: "left",
        });
      }
      _lineas.push({
        type: "linea",
        text: " ",
        align: "left",
      });

      print.sendMessage("print", {
        data: _lineas,
        printer: 1,
      });
    }

    function imprimirVentas_comprobante(cesto, ticket, copia) {
      prepararTicketVenta(ticket);
      copia = copia || false;
      var _lineas = [
        {
          type: "linea",
          text: $usuario.nombre,
          align: "center",
        },
        {
          type: "linea",
          text: ticket.hora,
          align: "center",
        },
      ];
      if (copia) {
        _lineas.push({
          type: "linea",
          text: "S:" + padding(ticket.ticketID, 6) + " N:" + cesto.length,
          align: "center",
        });
      } else {
        _lineas.push({
          type: "linea",
          text:
            "S:" +
            padding(ticket.ticketID, 6) +
            " C:" +
            padding(ticket.codigo) +
            " N:" +
            cesto.length,
          align: "center",
        });
      }
      _lineas.push({
        type: "linea",
        text:
          "T:" + ticket.monto.format(2) + config.moneda + " AG" + _fingerprint,
        align: "left",
      });
      if (ticket.cliente) {
        _lineas.push({
          type: "linea",
          text: `CLIENTE: ${ticket.cliente}`,
          align: "left",
        });
      }
      _lineas.push({
        type: "linea",
        text: " ",
        align: "left",
      });
      print.sendMessage("print", {
        data: _lineas,
        printer: 1,
      });
    }

    function cesto_print(c, cursor) {
      var tx;
      var e = c[0];
      var n = [];
      for (var i = 0; i < c.length; i++) {
        if (c[i].monto != e.monto) {
          parseItems(n, e);
          n = [];
        }
        const nnum = c[i].num || c[i].numero;
        const el = getElemento(nnum, c[i].sorteoID);
        n.push(el.n);
        e = c[i];
      }
      //ultimo grupo jugadas
      parseItems(n, e);

      function parseItems(n, e) {
        var a, b, c;
        tx = zip_series(n).join(",") + "x" + e.monto;
        cursor.push({
          type: "linea",
          text: tx,
          align: "left",
        });
        var atx = tx.split(",");
        /* while (atx.length > 0) {
          var ni = config.letrasLinea / 3;
          tx = atx.splice(0, ni).join(",");
          a = cursor[cursor.length - 1].text.length;
          b = tx.length;
          c = a + b;
          if (c > config.letrasLinea) {
            if (b <= config.letrasLinea) cursor.push({
              type: "linea",
              text: tx,
              align: "left"
            });
            else {
              var ci = tx.indexOf(",", 22);
              if (ci == -1) ci = tx.indexOf("x");
              cursor.push({
                type: "linea",
                text: tx.substr(0, ci) + "-",
                align: "left"
              });
              cursor.push({
                type: "linea",
                text: tx.substr(ci),
                align: "left"
              });
            }
          } else {
            cursor[cursor.length - 1].text += tx;
          }
        } */
      }
    }

    function cesto_ordenMonto(a, b) {
      var s1 = a.monto,
        s2 = b.monto;
      var n1 = a.numero,
        n2 = b.numero;
      return s1 == s2 ? n1 - n2 : s1 - s2;
    }

    function zip_series(a) {
      var b = [a[0]];
      var a1, a2, ls;
      for (var i = 1; i < a.length; i++) {
        a1 = parseInt(a[i]);
        a2 = parseInt(a[i - 1]) + 1;
        if (a1 != a2) {
          if (b[b.length - 1] != a[i - 1]) b[b.length - 1] += " al " + a[i - 1];
          b.push(a[i]);
        }
      }
      if (a1 == a2) {
        if (b[b.length - 1] != a[i - 1]) b[b.length - 1] += " al " + a[i - 1];
      }
      return b;
    }

    //zodiaco
    var vntzodiaco = $("#vnt-zodiaco");
    var zdata = [
      {
        zID: "TODOS",
        desc: "TODOS",
      },
      {
        zID: "CP",
        desc: "CAPRICORNIO",
      },
      {
        zID: "AC",
        desc: "ACUARIO",
      },
      {
        zID: "PI",
        desc: "PISCIS",
      },
      {
        zID: "AR",
        desc: "ARIES",
      },
      {
        zID: "TA",
        desc: "TAURO",
      },
      {
        zID: "GE",
        desc: "GEMINIS",
      },
      {
        zID: "CN",
        desc: "CANCER",
      },
      {
        zID: "LE",
        desc: "LEO",
      },
      {
        zID: "VI",
        desc: "VIRGO",
      },
      {
        zID: "LI",
        desc: "LIBRA",
      },
      {
        zID: "ES",
        desc: "ESCORPION",
      },
      {
        zID: "SA",
        desc: "SAGITARIO",
      },
    ];
    vntzodiaco.html(jsrender($("#rd-zodiaco-option"), zdata));

    //test
    if (args && args.length > 0) {
      var repeat = args[1] || 10;
      var montot = 0;
      var r = 0;
      var _sorteos = $sorteos.filter(sorteosDisponibles_filtro);
      var tm = new Date().getTime();

      function bot_venta() {
        var ns = getRandomInt(1, _sorteos.length);
        //var ns = 10;
        var t = [];
        for (var i = 0; i < ns; i++) {
          var sr = _sorteos[parseInt(Math.random() * _sorteos.length)];
          //var sr = _sorteos[0]; //ruleta 10am
          var elm = exploreBy("s", sr.sorteo, $elementos);
          var nn = parseInt(Math.random() * elm.length);
          var v = {
            monto: parseFloat(getRandomArbitrary(0.1, 10) * 100),
            //monto: 1000,
            numero: elm[nn].id,
            sorteoID: sr.sorteoID,
          };
          montot += v.monto;
          t.push(v);
        }
        var vkey = new Date().getTime();
        socket.sendMessage(
          "venta",
          {
            v: t,
          },
          function (e, d) {
            /*if (d.vt.length!= t.length) {
              alert("ALERTA: VERIFICAR TICKET, PUEDE ESTAR DEFECTUOSO");
          }*/
            $("#bot").html(
              ++r +
                " de " +
                repeat +
                " ventas confirmadas, con " +
                montot.format(2) +
                " bs"
            );
            if (r < repeat) bot_venta();
            else $("#bot").append(",en " + (new Date().getTime() - tm) + " ms");
          }
        );
      }
      bot_venta();
    }
  }

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

  function reporteDiario_nav(p, args) {
    var rpt;
    var data;
    var j = 0,
      pg = 0,
      pr = 0,
      cm = 0;

    var rf = $("#reporte-fecha");
    var help = {
      sorteo: function (id) {
        var sorteo = findBy("sorteoID", id, $sorteos);
        return sorteo ? sorteo.descripcion : padding(id, 6);
      },
      format: formatNumber,
    };

    $("#reporte").submit(function (e) {
      e.preventDefault(e);
      data = formControls(this);
      var f = formLock(this);
      socket.sendMessage("reporte-diario", data, function (e, d) {
        formLock(f, false);
        rpt = d || [];
        j = 0;
        pg = 0;
        pr = 0;
        rpt.forEach(function (item) {
          j += item.jugado;
          pg += item.pago;
          pr += item.premio;
        });

        $("#mnt-jugado").html(j.format(2));
        $("#mnt-premios").html(pr.format(2));
        $("#mnt-pagos").html(pg.format(2));
        $("#mnt-balance").html((j - pr).format(2));

        $("#mnt-pendiente").html((pr - pg).format(2));
        $("#mnt-ppagos").html(((pg / pr) * 100).format(2));

        $("#reporte-body").html(jsrender($("#rd-reporte-diario"), d, help));
      });
    });
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
          text: now.format("dd/mm/yy") + " " + now.format("TZ:240 h:MM:s TT"),
          align: "center",
        },
        {
          type: "linea",
          text: "REPORTE DIARIO",
          align: "center",
        },
      ];
      _lineas.push({
        type: "linea",
        text: "FECHA: " + data.fecha,
        align: "left",
      });
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
        text: "BALANCE: " + (j - pr).format(2),
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

    if (args && args.length == 1) {
      var a = args[0].split("-");
      rf.datepicker("setDate", new Date(a[0], parseInt(a[1]) - 1, a[2]));
      $("#reporte").trigger("submit");
    }
  }
  nav.paginas.addListener("reporte/diario", reporteDiario_nav);

  function reporteGeneral_nav(p, args) {
    var prm = $("#prm-select");
    var rpt;
    var j, pg, pr, cm, b;
    $("#reporte").submit(function (e) {
      e.preventDefault(e);
      var form = formLock(this);
      var data = formControls(this);
      socket.sendMessage("reporte-general", data, function (e, d) {
        formLock(form, false);
        rpt = d || [];
        updateView();
      });
    });

    prm.change(updateView);
    $("#print-reporte").click(function () {
      var now = new Date();

      rpt.forEach(function (item) {
        item.desc = item.descripcion.substr(-8);
      });

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
          text: "REPORTE GENERAL",
          align: "center",
        },
      ];
      _lineas.push({
        type: "linea",
        text: rpt[0].descripcion + " - " + rpt[rpt.length - 1].descripcion,
        align: "center",
      });
      if (prm.val() == 0) {
        _lineas.push({
          type: "linea",
          text: "**PREMIOS PAGADOS**",
          align: "center",
        });
        pr = pg;
        _lineas.push({
          type: "tabla",
          data: rpt,
          header: true,
          columns: [
            {
              text: "FECHA",
              field: "desc",
              width: 25,
            },
            {
              text: "JUGADO",
              field: "jugada",
              width: 25,
            },
            {
              text: "PREMIO",
              field: "pago",
              width: 25,
            },
            {
              text: "BALANCE",
              field: "balance",
              width: 25,
            },
          ],
        });
      } else {
        _lineas.push({
          type: "tabla",
          data: rpt,
          header: true,
          columns: [
            {
              text: "FECHA",
              field: "desc",
              width: 25,
            },
            {
              text: "JUGADO",
              field: "jugada",
              width: 25,
            },
            {
              text: "PREMIO",
              field: "premio",
              width: 25,
            },
            {
              text: "BALANCE",
              field: "balance",
              width: 25,
            },
          ],
        });
      }

      _lineas.push({
        type: "linea",
        text: " ",
        align: "left",
      });
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
        text: "COMISION: " + cm.format(2),
        align: "left",
      });
      _lineas.push({
        type: "linea",
        text: "BALANCE: " + (j - pr - cm).format(2),
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

    function updateView() {
      (j = 0), (pg = 0), (pr = 0), (cm = 0), (b = 0);

      $(".clr-val").html("--");
      $("#reporte-body").html("");
      rpt.forEach(function (item) {
        item.balance = item.jugada - (prm.val() == 0 ? item.pago : item.premio);

        b += item.balance;
        j += item.jugada;
        pg += item.pago;
        pr += item.premio;
        cm += item.comision;
      });

      $("#mnt-jugado").html(j.format(2));
      $("#mnt-premios").html(pr.format(2));
      $("#mnt-pagos").html(pg.format(2));
      $("#mnt-balance").html((b - cm).format(2));

      $("#comision").html(cm.format(2));
      $("#mnt-neto").html(b.format(2));

      if (rpt.length == 0) return;

      if (prm.val() == 0)
        $("#reporte-body").html(jsrender($("#rd-reporte-diario"), rpt, hlp));
      else
        $("#reporte-body").html(jsrender($("#rd-reporte-diario2"), rpt, hlp));
    }
  }
  nav.paginas.addListener("reporte/general", reporteGeneral_nav);

  function reporteSorteo_nav(p, args) {
    var help = {
      elm: function (n) {
        var e = findBy("id", n, $elementos);
        return e ? e.descripcion : n;
      },
      pago: function (p) {
        return p > 0 ? "SI" : "NO";
      },
      padding: padding,
      dateFormat: dateFormat,
    };

    var rf = $("#reporte-fecha");
    rf.change(function (e) {
      socket.sendMessage(
        "sorteos",
        {
          nombres: e.target.value,
        },
        function (e, d) {
          $("#sorteos").html(jsrender($("#rd-sorteo-option"), d));
        }
      );
    });
    rf.trigger("change");

    $("#reporte").submit(function (e) {
      e.preventDefault(e);
      var data = formControls(this);
      var f = formLock(this);

      $("#reporte-vnt").html("");
      $("#reporte-elm").html("");
      socket.sendMessage("reporte-sorteo", data, function (e, d) {
        formLock(f, false);
        d.vnt = d.vnt || [];
        var j = 0,
          pr = 0,
          pg = 0;
        var nan = 0,
          npr = 0,
          npg = 0;
        d.vnt.forEach(function (item) {
          if (item.anulado == 0) {
            j += item.monto;
            pr += item.premio;
            pg += item.pago > 0 ? item.premio : 0;
            if (item.premio > 0) npr++;
            if (item.pago > 0) npg++;
            if (item.anulado == 1) nan++;
          }
        });

        $("#mnt-jugado").html(j.format(2));
        $("#mnt-premios").html(pr.format(2));
        $("#mnt-pagos").html(pg.format(2));
        $("#tk-total").html(d.vnt.length);
        $("#tk-premios").html(npr);
        $("#tk-pagos").html(npg);

        $("#reporte-vnt").html(jsrender($("#rd-reporte-vnt"), d.vnt));

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
      });
    });

    if (args && args.length > 0) {
    }
  }
  nav.paginas.addListener("reporte/sorteo", reporteSorteo_nav);

  function reporteVentas_nav(p, args) {
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
        if (!d.last) socket.addListener("reporte-ventas", prefetch);
        all = d.data || [];
        formLock(f, false);
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

      var cm = j * $usuario.comision * 0.01;
      $("#mnt-jugado").html(j.format(2));
      $("#mnt-premios").html(pr.format(2));
      $("#mnt-pagos").html(pg.format(2));
      $("#mnt-balance").html((j - pr - cm).format(2));
      $("#mnt-comision").html(cm.format(2));

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

    if (args && args.length == 1) {
      var a = args[0].split("-");
      rf.datepicker("setDate", new Date(a[0], parseInt(a[1]) - 1, a[2]));
      $("#reporte").trigger("submit");
    }
  }
  nav.paginas.addListener("reporte/ventas", reporteVentas_nav);

  function preferencias_nav(p, args) {
    var modoImpresion = $("#md-impresion");
    var formatoImpresion = $("#ft-impresion");
    var letrasLinea = $("#lt-linea");
    var ordenSorteo = $("#md-orden");
    var modoInterfaz = $("#md-intefaz");

    modoInterfaz.change(function (e) {
      var value = modoInterfaz.val();
      setConfig(CONFIG.INTERFAZ_MODO, value);
    });
    modoInterfaz.select2("val", config.modoInterfaz || "ventamax");
    modoInterfaz.val(config.modoInterfaz || "ventamax");

    modoImpresion.change(function (e) {
      setConfig(CONFIG.IMPRIMIR_MODO, modoImpresion.val());
    });
    modoImpresion.select2("val", config.modoImpresion || 1);
    modoImpresion.val(config.modoImpresion || 1);

    formatoImpresion.change(function (e) {
      setConfig(CONFIG.IMPRIMIR_FORMATO, formatoImpresion.val());
    });
    var fi = config.formatoImpresion;
    formatoImpresion.select2("val", fi || 0);
    formatoImpresion.val(fi || 0);

    letrasLinea.val(config.letrasLinea);
    $("#btnletras").click(function () {
      setConfig(CONFIG.IMPRIMIR_LETRASxLINEA, letrasLinea.val());
      notificacion("Letras Linea", "Cambio exitoso");
    });

    ordenSorteo.select2("val", config.ordenSorteos || 0);
    ordenSorteo.val(config.ordenSorteos);
    ordenSorteo.change(function (e) {
      setConfig(CONFIG.SORTEOS_ORDEN, ordenSorteo.val());
    });

    $("#prf-ticketPrueba").click(function (e) {
      var _lineas = [
        [
          {
            type: "linea",
            text: "AG. DEMO",
            align: "center",
          },
          {
            type: "linea",
            text: "04/06/17 06:12:14 AM",
            align: "center",
          },
          {
            type: "linea",
            text: "9999999-1234",
            align: "center",
          },
          {
            type: "linea",
            text: "TICKET PRUEBA",
            align: "center",
          },
          {
            type: "linea",
            text: "RULETA ACTIVA 10AM",
            align: "center",
          },
          {
            type: "linea",
            text: "#0\t DELFIN\t 99999",
            align: "center",
          },
          {
            type: "linea",
            text: "#01\t CARNERO\t 99999",
            align: "center",
          },
          {
            type: "linea",
            text: "#02\t TORO\t 99999",
            align: "center",
          },
          {
            type: "linea",
            text: "#03\t CIEMPIES\t 99999",
            align: "center",
          },
          {
            type: "linea",
            text: "#04\t ALACRAN\t 99999",
            align: "center",
          },
          {
            type: "linea",
            text: "#05\t LEON\t 99999",
            align: "center",
          },
          {
            type: "linea",
            text: "#06\t RANA\t 99999",
            align: "center",
          },
          {
            type: "linea",
            text: "#07\t PERICO\t 99999",
            align: "center",
          },
          {
            type: "linea",
            text: "#08\t RATON\t 99999",
            align: "center",
          },
          {
            type: "linea",
            text: "#09\t AGUILA\t 99999",
            align: "center",
          },
          {
            type: "linea",
            text: "TOTAL: 999990",
            align: "center",
          },
          {
            type: "linea",
            text: "CADUCA EN 3 DIAS",
            align: "center",
          },
          {
            type: "linea",
            text: "c8dda1ff1abe1e7ddd1042a2213b3da0",
            align: "center",
          },
          {
            type: "linea",
            text: " ",
            align: "left",
          },
        ],
        [
          {
            type: "linea",
            text: "AG. DEMO",
            align: "center",
          },
          {
            type: "linea",
            text: "04/06/17 06:12:14 AM",
            align: "center",
          },
          {
            type: "linea",
            text: "9999999-1234",
            align: "center",
          },
          {
            type: "linea",
            text: "TICKET PRUEBA",
            align: "center",
          },
          {
            type: "tabla",
            header: false,
            columns: [
              {
                field: "l1",
                text: "RULETA ACTIVA 10AM",
                width: "50",
              },
              {
                field: "l2",
                text: " ",
                width: "50",
              },
            ],
            data: [
              {
                l1: "0\tDELF\t99999",
                l2: "01\tCARN\t99999",
              },
              {
                l1: "02\tTORO\t99999",
                l2: "03\tCIEM\t99999",
              },
              {
                l1: "04\tALAC\t99999",
                l2: "05\tLEON\t99999",
              },
              {
                l1: "06\tRANA\t99999",
                l2: "07\tPERI\t99999",
              },
              {
                l1: "08\tRATO\t99999",
                l2: "09\tAGUI\t99999",
              },
            ],
          },
          {
            type: "linea",
            text: "TOTAL: 999990",
            align: "center",
          },
          {
            type: "linea",
            text: "CADUCA EN 3 DIAS",
            align: "center",
          },
          {
            type: "linea",
            text: "c8dda1ff1abe1e7ddd1042a2213b3da0",
            align: "center",
          },
          {
            type: "linea",
            text: " ",
            align: "left",
          },
        ],
        [
          {
            type: "linea",
            text: "AG. DEMO",
            align: "center",
          },
          {
            type: "linea",
            text: "04/06/17 06:12:14 AM",
            align: "center",
          },
          {
            type: "linea",
            text: "9999999-1234",
            align: "center",
          },
          {
            type: "linea",
            text: "TICKET PRUEBA",
            align: "center",
          },
          {
            type: "tabla",
            header: false,
            columns: [
              {
                field: "l1",
                text: "RULETA ACTIVA 10AM",
                width: 33,
              },
              {
                field: "l2",
                text: " ",
                width: 33,
              },
              {
                field: "l3",
                text: " ",
                width: 33,
              },
            ],
            data: [
              {
                l1: "0x99999",
                l2: "01x99999",
                l3: "02x99999",
              },
              {
                l1: "03x99999",
                l2: "04x99999",
                l3: "05x99999",
              },
              {
                l1: "06x99999",
                l2: "07x99999",
                l3: "08x99999",
              },
              {
                l1: "09x99999",
                l2: " ",
                l3: " ",
              },
            ],
          },
          {
            type: "linea",
            text: "TOTAL: 999990",
            align: "center",
          },
          {
            type: "linea",
            text: "CADUCA EN 3 DIAS",
            align: "center",
          },
          {
            type: "linea",
            text: "c8dda1ff1abe1e7ddd1042a2213b3da0",
            align: "center",
          },
          {
            type: "linea",
            text: " ",
            align: "left",
          },
        ],
      ];
      var modoImpresion = config.modoImpresion || 0;
      if (modoImpresion == "atm") modoImpresion = 2;

      print.sendMessage("print", {
        data: _lineas[modoImpresion],
        printer: 1,
      });
    });

    var bprint = $("#btnimprimir");
    var scprint = $("#scimprimir");
    scprint.val(getKeyName(config.imprimirTecla));
    bprint.click(function (e) {
      $(document).on("keydown", keydown_handler);
      bprint.html("Presione una tecla...");

      function keydown_handler(e) {
        $(document).off("keydown", keydown_handler);
        if (!e.metaKey) {
          e.preventDefault();
        }
        var key = getKeyName(e.keyCode);
        if (key) {
          scprint.val(key);
          setConfig(CONFIG.IMPRIMIR_TECLA, e.keyCode);
        }
        bprint.html("Editar");
      }
    });

    $("#prf-rest-numeros").click(function () {
      var c = confirm(
        "Esta accion reinicara el listado de numeros almacenados y reiniciara su sesion"
      );
      if (c) {
        storage.removeItem(CONFIG.ELEMENTOS);
        storage.removeItem(CONFIG.ELEMENTOS_HASH);
        location.reload();
      }
    });

    let monedaInput = $("#moneda");
    $("#monedaOK").click((e) => {
      setConfig(CONFIG.MONEDA, monedaInput.val());
      notificacion("Moneda establecida correctamente");
    });
    monedaInput.val(config.moneda);

    let clienteNombre = $("#clienteNombre");
    clienteNombre.select2("val", config.nombreCliente);
    clienteNombre.val(config.nombreCliente);
    clienteNombre.change(function (e) {
      setConfig(CONFIG.NOMBRE_CLIENTE, clienteNombre.val());
    });

    if (args && args.length > 0) {
      $("html, body").animate(
        {
          scrollTop: $("#" + args[0]).offset().top,
        },
        500
      );
    }
  }
  nav.paginas.addListener("preferencias", preferencias_nav);

  function ayuda_nav(p, args) {
    var indice = ["#ayuda-venta", "#ayuda-pago", "#ayuda-anular"];
    if (args.length > 0) {
      var index = args[0];
      $("html, body").animate(
        {
          scrollTop: $(indice[index]).offset().top,
        },
        1000
      );
    }
  }
  nav.paginas.addListener("ayuda", ayuda_nav);

  // MAIN //
  function main_initSocket(proxy) {
    host = proxy || host;
    if (socket) {
      socket.removeListener(NetEvent.SOCKET_CLOSE, socket_CLOSE);
      socket.removeListener(NetEvent.SOCKET_ERROR, socket_ERROR);
    }
    socket = new Net("ws://" + host, false);
    socket.addListener(NetEvent.SOCKET_OPEN, socket_OPEN);
    socket.addListener(NetEvent.LOGIN, socket_LOGIN);
    socket.addListener("duplicado", socket_duplicado);
    socket.addListener("close-mant", socket_closing);
    socket.addListener(NetEvent.SOCKET_CLOSE, socket_CLOSE);
    socket.addListener(NetEvent.SOCKET_ERROR, socket_ERROR);
    socket.addListener("init", init);
    socket.addListener("fingerprint", fingerprint);
    socket.addListener(NetEvent.DATA_CHANGE, function () {
      $("#main-bin").text(Net.parseBytes(socket.bytesIn));
      $("#main-bout").text(Net.parseBytes(socket.bytesOut));
    });
    socket.addListener("venta-anular-banca", function (e, d) {
      notificacion(
        "TICKET ANULADO POR BANCA",
        "TICKET #" + d,
        "growl-success",
        true
      );
    });
    socket.addListener("sorteos-update", function (e, d) {
      $sorteos = d.sorteos;
    });
    socket.addListener("estatus-change", function (e, d) {
      var cierra = d.cierra ? "CIERRA" : "ABRE";
      var sorteo = findBy("sorteoID", d.sorteoID, $sorteos);
      if (sorteo)
        notificacion(
          "SISTEMA",
          "SORTEO <strong>" + sorteo.descripcion + "</strong> " + cierra
        );
    });
    socket.addListener("srt-premio", function (e, d) {
      var sorteo = findBy("sorteoID", d.sorteoID, $sorteos);
      var elemento = findBy("id", d.ganador, $elementos);
      if (sorteo)
        notificacion(
          "PREMIOS RECIBIDOS",
          "SORTEO: " +
            sorteo.descripcion +
            "</br>#" +
            elemento.n +
            " " +
            elemento.d,
          null,
          false
        );
    });
    socket.addListener("metas", function (e, d) {
      $meta = d;

      if ($meta.hasOwnProperty("msg_init") && $meta.msg_init.length > 0) {
        notificacion("MENSAJE BANCA", $meta.msg_init, "", true);
      }
      if ($meta.hasOwnProperty("msg_srv") && $meta.msg_srv.length > 0) {
        notificacion("MENSAJE SERVIDOR", $meta.msg_srv, "", true);
      }
    });
    var elementosRecibidos = {};
    socket.addListener("elementos-init", function (e, d) {
      if (d.hasOwnProperty("hash")) {
        console.log(elementosRecibidos);
        storage.setItem(CONFIG.ELEMENTOS_HASH, d.hash);
        storage.setItem(CONFIG.ELEMENTOS, JSON.stringify(elementosRecibidos));
        $elementos = elementosRecibidos;
        notificacion("Lista de numeros actualizados");
      } else {
        elementosRecibidos[d[0].s] = d;
      }
    });
    socket.connect();
    var timer = $("#pre-timer");
    var socket_conectando = 0;
    socket_timer = setInterval(() => {
      timer.html(10 - socket_conectando++);
      if (socket_conectando > 10) {
        clearInterval(socket_timer);
        timer.html("");
        var proxy = hostAlt;
        main_initSocket(proxy);
      }
    }, 1000);
  }
  var socket_timer;
  main_initSocket();
  var _fingerprint;
  var _urfinger;
  var _timer = 0;

  function init(e, d) {
    $servidor.hora = d.t;

    if (storage.fpud62737hdh2 == null) {
      storage.fpud62737hdh2 = cliente.getFingerprint();
    }
    _fingerprint = storage.fpud62737hdh2;
    _urfinger = md5(_fingerprint.toString() + d.t);

    //validar hora servidor-cliente
    if (_timer > 0) clearInterval(_timer);
    _timer = setInterval(function () {
      $servidor.hora += 1000;
    }, 1000);

    var loginCache = storage.getItem("loto_taqlogin");
    if (loginCache) {
      login(JSON.parse(loginCache));
    }
  }

  function fingerprint(e, d) {
    socket.removeListener("fingerprint", fingerprint);
    socket.sendMessage(e, _fingerprint);
  }
  $("#logolink").click(function () {
    location.reload(true);
  });

  function socket_duplicado(e) {
    nav.nav("506", null, null, "body");
    socket.removeListener(NetEvent.SOCKET_CLOSE, socket_CLOSE);
    socket.close();
  }

  function socket_closing(e) {
    nav.nav("601", null, null, "body");
    socket.removeListener(NetEvent.SOCKET_CLOSE, socket_CLOSE);
    socket.close();
  }

  function socket_OPEN(e) {
    clearInterval(socket_timer);
    $("#conectando").fadeOut();
  }

  function login(d, f) {
    d.fp = _urfinger;
    socket.sendMessage("login", d, f);
  }

  function socket_ERROR(e) {
    clearInterval(socket_timer);
    var proxy = hostAlt;
    main_initSocket(proxy);
    socket.removeListener(NetEvent.SOCKET_CLOSE, socket_CLOSE);
  }

  function socket_CLOSE(e) {
    $("#conectando").fadeIn();
    vendiendo = false;
    setTimeout(main_initSocket, 3000);
  }

  function socket_LOGIN(e, d) {
    if (d.hasOwnProperty("code")) {
      if (d.code == 5) {
        nav.nav("507", null, null, "body");
        storage.removeItem("loto_taqlogin");
        socket.removeListener(NetEvent.SOCKET_CLOSE, socket_CLOSE);
        socket.close();
      } else if (d.code == 505)
        notificacion(
          "USUARIO SUSPENDIDO",
          "Comuniquese con su administrador o banquero",
          "growl-danger"
        );
      return;
    }
    $usuario = d.taq;
    $(".username").html($usuario.nombre);

    function validarElementos(hash, cb) {
      var localHash = storage.getItem(CONFIG.ELEMENTOS_HASH);
      if (localHash == hash) {
        try {
          loadLocal();
          cb();
        } catch (e) {
          validarElementos("refres", cb);
        }
      } else {
        notificacion(
          "Espere...",
          '<p id="ntf-cargaelem"><i class="fa fa-spinner fa-spin"></i> Recibiendo listado animales</p>'
        );
        elementosRecibidos = {};
        socket.sendMessage("elementos-init", null, (e, d) => {
          nav.navUrl();
        });
      }
    }

    //$elementos = d.elementos;
    $sorteos = d.sorteos;

    $servidor.hora = d.time;

    function loadLocal() {
      $elementos = JSON.parse(storage.getItem(CONFIG.ELEMENTOS));
      var n, a;
      var z = [
        "CAPRICORNIO",
        "ACUARIO",
        "PISCIS",
        "ARIES",
        "TAURO",
        "GEMINIS",
        "CANCER",
        "LEO",
        "VIRGO",
        "LIBRA",
        "ESCORPIO",
        "SAGITARIO",
      ];
      if (!$elementos || $elementos.length == 0) {
        var c = confirm(
          "No hay registrados elementos para los sorteos registrados, desea cargarlos nuevamente?"
        );
        if (c)
          validarElementos("", function () {
            nav.navUrl();
          });
      }
    }
    validarElementos(d.elementos, function () {
      nav.navUrl();
    });
  }
  //UI
  //ANULAR
  $("#vnt-anular").submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    var f = formLock(this);
    setTimeout(function () {
      formLock(f, false);
    }, 2000);
    //actividad($actividad.ANULAR,data);
    socket.sendMessage("venta-anular", data, function (e, d) {
      //actividad($actividad.ANULAR,d);
      formReset(f);
      if (d.hasOwnProperty("code")) {
        if (d.code == 2) notificacion("TICKET NO EXISTE");
        else if (d.code == 4) notificacion("TICKET YA SE ENCUENTRA ANULADO");
        else if (d.code == 5)
          notificacion("TICKET INVALIDO", "TICKET CADUCADO");
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
    var premios;
    socket.sendMessage("venta-premios", data, function (e, d) {
      formLock(f, false);
      if (d.hasOwnProperty("code")) {
        notificacion("TICKET NO EXISTE", "");
      } else {
        premios = d.prm;
        $("#md-pagar-tpremio").html(jsrender($("#rd-premio-ticket"), [d.tk]));
        $("#md-pagar-prms").html(jsrender($("#rd-premio-premios"), d.prm, hlp));
        $(".pagar-premio").click(function (e) {
          var btn = $(e.target);
          var venta = btn.data("id");
          var ticket = btn.data("ticket");
          var sorteo = btn.data("sorteoid");
          var prm = findBy("ventaID", venta, d.prm).premio;
          var codigo = parseInt($("#md-pagar-codigo").val());
          btn.prop("disabled", true);
          socket.sendMessage(
            "venta-pagar",
            {
              id: venta,
              tk: ticket,
              cod: codigo,
              sorteoID: sorteo,
              premio: prm,
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
        $("#anulado-timestamp").click(function (e) {
          e.preventDefault(e);
          var ticket = $(this).attr("ticketID");
          socket.sendMessage(
            "ticket-anulado",
            {
              ticketID: ticket,
            },
            function (e, d) {
              if (d.hasOwnProperty("code"))
                notificacion("ERROR AL LEER HORA DE ANULACION");
              else {
                $("#anulado-labelstamp").html(
                  'SI <i class="fa fa-clock-o"></i> ' + d.tiempo
                );
              }
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
  //END UI
  nav.navUrl();
  $(".logout").click(function (e) {
    e.preventDefault(e);
    $usuario = null;
    $(".username").html("Usuario");
    localStorage.removeItem("loto_taqlogin");
    nav.nav("inicio");
  });
};
init();
