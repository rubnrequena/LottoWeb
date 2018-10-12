var init = function () {
// VARS //
    var storage = localStorage;
// SOCKET
    var host = $.cookie("taquilla") || location.hostname+":4022";
    var socket;
//CONFIG
    var config = {
        mimp:storage.getItem("srq.taq.modoImpresion") || 1,
        imprimirTecla:storage.getItem("srq.taq.imprimirTecla") || 107,
        formatoImpresion:storage.getItem("srq.taq.formatoImpresion") || 0,
        letrasLinea:storage.getItem('srq.taq.letrasLinea') || 25,
        ordenSorteos:storage.getItem('srq.taq.ordenSorteos') || 0
    };

    function setConfig (key,val) {
        storage.setItem("srq.taq."+key,val);
        config[key] = val;
    }
//IMPRESORA
    var canPrint=false; var grt;
    var print = new Net("ws://127.0.0.1:9999",false);
    print.addListener(NetEvent.SOCKET_OPEN, function (e) {
        canPrint=true;
        notificacion("ASISTENTE IMPRESION","CONEXION EXITOSA","growl-success");
    });
    print.addListener(NetEvent.SOCKET_CLOSE,function (e) {
        canPrint= cliente.isMobile()?true:false;
        if (config.formatoImpresion==0 && cliente.isMobile()==false) {
            grt = notificacion("ASISTENTE IMPRESION", jsrender($('#rd-print-alert')), "growl-danger", true);
            $('.print-rcn').off('click', onPrint);
            $('.print-rcn').on('click', onPrint);
        }
    });
    function onPrint () {
        $('#gritter-item-'+grt).remove();
        print.connect();
    }
    print.connect();

//NAVEGADOR
    var nav = new Navegador();
    nav.folder = "paginas";
    nav.viewport = ".contentpanel";
    nav.validate = function (page,params) {
        //if (window.location.hostname!="srq.com.ve") page = "507"; //SOLO PARA PRODUCCION
        if (page=="507") return page;
        return $usuario?page:"login";
    };

// SISTEMA
    var $usuario;
    var $elementos;
    var $sorteos;
    var $numeros;
    var $servidor = {};
    var $meta = {};


//ACTIVIDADES
    var $actividad = {
        LOGIN:1,
        VENTA:2,
        ANULAR:3,
        PAGAR:4
    };

    function sorteosDisponibles_filtro (s) {
        return s.cierra>$servidor.hora && s.abierta==true;
    }

    function getElemento (id) {
        return findBy("id",id,$elementos);
    }
    function getSorteo (id) {
        return findBy("sorteoID",id,$sorteos);
    }

    function sorteosInvalidos (s) {
        var ss; var a=[];
        s.forEach(function (item) {
            ss = findBy("sorteoID",item,$sorteos);
            a.push(ss?'<p>'+ss.descripcion+'</p>':'<p>'+padding(item,5)+'</p>');
        });
        return a.join("");
    }
    function topeExedido (data) {
        var e, s, t, a=[];
        data.forEach(function (tope) {
            e = findBy("id",tope.n,$elementos);
            s = findBy("sorteoID",tope.s,$sorteos);
            t = tope.hasOwnProperty("td")?'CUPO DISPONIBLE: '+tope.td:'CUPO DISPONIBLE: '+tope.tm;
            if (e && s) a.push('<p>'+ s.descripcion+': '+ e.d+'</p><p>'+t+'</p>');
        });
        return a.join("");
    }

// NAVEGADOR //
    /*
     Vr. 17.05.092
     */
    var cliente = new ClientJS();
    nav.paginas.addListener(Navegador.ENTER, function (p,a) {
        // Adjust mainpanel height
        var main = jQuery('.mainpanel');
        var docHeight = jQuery(document).height();
        var mh = main.height();
        if (docHeight > mh)
            main.height(docHeight);

        select2w($('.s2'),  {hideSelectionFromResult: function (a) {
            return true;
        },placeholder:'Seleccione...',language:'es'});

        $('.date').datepicker({
            dateFormat:'yy-mm-dd'
        });
        $('.now').datepicker('setDate',new Date());

        /*$('#ebsf').change(function (e) {
            var n = $('.rcono');
            var s = $(this).is(':checked');
            n.each(function (index) {
                var nn = $(this);
                if (s) nn.html(parseFloat(nn.html())*100000);
                else nn.html(parseFloat(nn.html())/100000);
            });
        })*/
    });
    nav.paginas.addListener(Navegador.COMPLETE, function (p, a) {
        // Minimize Button in Panels
        var heading = jQuery('.panel-heading');
        heading.attr("title","Click para expandir y/o contraer panel");
        heading.click(function(){
            var t = jQuery(this).find('.minimize');
            var p = t.closest('.panel');
            if(!t.hasClass('maximize')) {
                p.find('.panel-body, .panel-footer').slideUp(200);
                t.addClass('maximize');
                t.html('&plus;');
            } else {
                p.find('.panel-body, .panel-footer').slideDown(200);
                t.removeClass('maximize');
                t.html('&minus;');
            }
            return false;
        });
        // Close Button in Panels

        jQuery('.panel .panel-close').click(function(){
            jQuery(this).closest('.panel').fadeOut(200);
            return false;
        });
    });

    nav.paginas.addListener("login",function (p,args) {
        $('#login-form').submit(function (e) {
            e.preventDefault(e);
            var data = formControls(this);
            var f = formLock(this);
            login(data,function (e, d) {
                formLock(f,false);
                if (d.hasOwnProperty("code")) {
                    if (d.code==2) notificacion("CLAVE INVALIDA");
                } else {
                    var recordar = $('#recordar').is(':checked');
                    if (recordar) storage.setItem("loto_taqlogin", JSON.stringify(data));
                    else storage.removeItem("loto_taqlogin");
                }
            });
        })
    });

    nav.paginas.addListener("inicio",function (p,a) {
        var help = {
            gano: function (g) {
                var e = findBy('id',g,$elementos);
                return g==0?'':"#"+ e.n+" "+e.d;
            },
            formatDate:dateFormat
        };
        var timer;

        $('#pagina-tiulo').html('<i class="fa fa-home"></i> Bienvenido, '+$usuario.nombre);

        if ($sorteos) {
            timer = setInterval(sorteosTiempoRestante, 60000);
            $('#sorteos-body').html(jsrender($('#rd-inicio-sorteos-row'), $sorteos,help));
            sorteosTiempoRestante();
        }
        function sorteosTiempoRestante() {
            // TODO: VALIDAR QUE HAYAN SORTEOS
            var p = nav.current().page;
            if (p!="inicio") { clearInterval(timer); return; }
            $('#servidor-tiempo').html(dateFormat($servidor.hora,'TZ:240 dd/mm/yy hh:MM TT'));
            $sorteos.forEach(function (sorteo) {
                if (sorteo.abierta && sorteo.cierra>$servidor.hora)
                    $('#srt-resta-' + sorteo.sorteoID).html(msToString(sorteo.cierra - $servidor.hora));
                else $('#srt-resta-' + sorteo.sorteoID).html("<label class='label label-danger'>CERRADO</label>");
            })
        }
    });

    nav.paginas.addListener('venta', venta);
    nav.paginas.addListener('ventamax',venta);

    var vendiendo=false;
    function venta (p,args) {

        if (!$sorteos) {
            nav.nav("101");
            return;
        }

        var formatoImpresion = config.formatoImpresion || 0;
        if (formatoImpresion>0) {
            if (formatoImpresion==1) $('#printbtn').html('<i class="fa fa-envelope"></i> ENVIAR');
            if (formatoImpresion==2) $('#printbtn').html('<i class="fa fa-mobile-phone"></i> ENVIAR');
            if (formatoImpresion==3) $('#printbtn').html('<i class="fa fa-whatsapp"></i> ENVIAR');
        } else if (formatoImpresion<0) {
            $('#print-group').html(jsrender($('#print-select')));

            $('#print-paper').click(function (e) {
                e.preventDefault(e);
                formatoImpresion = 0;
                $('#print-label').html('<i class="fa fa-print"></i> IMPRIMIR');
                cesto_realizarVenta();
            });
            $('#print-mail').click(function (e) {
                e.preventDefault(e);
                formatoImpresion = 1;
                $('#print-label').html('<i class="fa fa-envelope"></i> ENVIAR');
                srqag.modal();
            });
            $('#print-ws').click(function (e) {
                e.preventDefault(e);
                formatoImpresion = 3;
                $('#print-label').html('<i class="fa fa-whatsapp"></i> ENVIAR');
                srqag.modal();
            });
        }

        //ticketPendiente
        if (localStorage.getItem("lastTk")) {
            var ltk = JSON.parse(localStorage.getItem("lastTk"));
            var ltotal=0;
            for (var i= 0;i<ltk.length;i++) { ltotal+=ltk[i].monto; }
            localStorage.removeItem("lastTk");
            notificacion("TICKET PENDIENTE",'Posiblemente el ultimo ticket enviado por <b>'+ltotal.format(2)+'bs</b>, no se confirmo. </br>Por favor proceda a verificar.',null,true);
        }

        if (!$('body').hasClass('leftpanel-collapsed')) {
            $('.menutoggle').trigger("click");
        }

        select2w($('.s2a'),{
            openOnEnter:false
        });

        nav.paginas.addListener(Navegador.EXIT,exitPage);
        function exitPage (e) {
            nav.paginas.removeListener(Navegador.EXIT,exitPage);
            $(document).off("keydown", onKeyDown);
        }

        $('#taq-nombre').html($usuario.nombre);
        var cesto = [];
        var num = $('#vnt-numeros');
        var sorteos = $('#vnt-sorteos');
        var monto = $('#vnt-monto');
        var total = $('#vnt-total');
        var btnImprimir = $('#vnt-btn');
        var _ultimoTicket;
        var helper = {
            pleno: function (num) {
                var e = getElemento(num);
                return "#"+ e.n+" "+ e.d;
            },
            num: function (n) { return getElemento(n).n; },
            sorteo: function (sorteo) {
                var s = findBy("sorteoID",sorteo,$sorteos);
                return s.descripcion;
            },
            formatn:formatNumber
        };

        var srqag = $('#md-srqag'), srqag_s2 = $('#srag-input');
        var srqag_data = storage.getItem("srqag.agenda")?JSON.parse(storage.getItem("srqag.agenda")):[{n:"",v:""}];
        srqag_s2.html(jsrender($('#rd-srqag-item'),srqag_data));

        srqag.on("shown.bs.modal", function (e) {
            $('#srag-input').select2("focus");
            srqag.on("keydown", srqag_handler);
            $(document).off("keydown", onKeyDown);
        });
        srqag.on("hide.bs.modal", function (e) {
            srqag.off("keydown", srqag_handler);
            $(document).on("keydown", onKeyDown);
        });
        $('#srqag-nuevo').submit(function (e) {
            $('.srqag-ferror').addClass("hidden");
            e.preventDefault(e);
            var data = formControls(this);
            var existe = findIndex("v",data.valor,srqag_data);
            if (existe>-1) {
                $('#srqag-existeh').removeClass("hidden"); return;
            }
            var valid=0;
            if (validateMail(data.valor)) valid++;
            if (parseInt(data.valor)) valid++;
            if (valid>0) {
                srqag_data.push({n:data.nombre,v:data.valor});
                srqag_data.sort(function (a,b) {
                    return a.n.localeCompare(b.n);
                });
                srqag_s2.html(jsrender($('#rd-srqag-item'),srqag_data));
                formReset(this);
                srqag_s2.select2("focus");
                storage.setItem("srqag.agenda",JSON.stringify(srqag_data));

                $('#srqag-mailg').removeClass("has-error");
                $('#srqag-to').addClass("hidden");
                $('#srqag-existeh').addClass("hidden");
            } else {
                $('#srqag-mailg').addClass("has-error");
                $('#srqag-to').removeClass("hidden");
            }
        });
        $('#srqag-rem').click(function (e) {
            e.preventDefault(e);
            var i = srqag_s2.prop("selectedIndex");
            srqag_data.splice(i,1);
            storage.setItem("srqag.agenda",JSON.stringify(srqag_data));
            srqag_s2.html(jsrender($('#rd-srqag-item'),srqag_data));
            srqag_s2.select2("val","");
        });
        // METHODS
        $('#md-enviar-ok').click(validateEmailPhone);

        function srqag_handler (e) {
            if (e.which==parseInt(config.imprimirTecla)) {
                e.preventDefault(e);
                setTimeout(function () {
                    validateEmailPhone();
                },100);
            }
            if (e.which==107) {
                e.preventDefault(e);
                $('#srqag-nombre').focus();
            }
        }

        function validateEmailPhone() {
            var v = $('#srag-input').val();
            if (formatoImpresion==1) {
                if (validateMail(v)) { cesto_realizarVenta({mail:v}); srqag.modal("hide"); }
                else alert('CORREO INVALIDO');
            }
            if (formatoImpresion==2) {
                alert("ESTIMADOS USUARIOS, SRQ NOTIFICA QUE LAMENTABLEMENTE HEMOS SUSPENDIDO TEMPORALMENTE EL SERVICIO DE MENSAJERIA POR PROBLEMAS CON LA OPERADORA, ESPERAMOS PRONTO SOLUCIONAR EL INCONVENIENTE.");
                /*if (validatePhone(v)) { cesto_realizarVenta({sms:v}); srqag.modal("hide"); }
                 else alert('TELEFONO INVALIDO');*/
            }
            if (formatoImpresion==3) {
                v = parseFloat(v).toString();
                if (v.length==10) v = "58"+v;
                if (validatePhone(v)) { cesto_realizarVenta({ws:v}); srqag.modal("hide"); }
                else alert('TELEFONO INVALIDO');
            }
        }

        function cesto_realizarVenta(meta) {
            if (cesto.length==0) return;

            //validar minimos
            var mtt=0;
            for (var i=0;i<cesto.length;i++) {
                mtt+= cesto[i].monto;
                if (cesto[i].monto<$meta.vnt_min_num) {
                    var num = findBy("id",cesto[i].numero,$elementos);
                    notificacion('MONTO MINIMO NUMERO','No es posible procesar la venta, el monto asignado al #'+num.n+' '+num.d+' no cumple con el minimo requerido ('+formatNumber($meta.vnt_min_num,2)+') por su banca' );
                    return;
                }
            }
            if (mtt<$meta.vnt_min_tkt) {
                notificacion('MONTO MINIMO TICKET','No es posible procesar la venta, el monto total del ticket ('+mtt+') no cumple con el minimo requerido por su banca ('+formatNumber($meta.vnt_min_tkt,2)+')');
                return;
            }

            if (vendiendo) {
                notificacion('<i class="fa fa-hand-stop-o"></i> ESPERE.. VENTA EN PROCESO.'); return;
            }

            if (!meta) {
                if (formatoImpresion>=1) {
                    srqag.modal(); return;
                } else if (formatoImpresion==-1) {
                    $('#printbtn').click(); return;
                }
            } else {
                if (meta.mail==null && meta.sms == null && meta.ws==null) return;
                /*if (!validateMail(meta.mail)) {
                    alert("Correo introducido es invalido");
                    return;
                }*/
            }
            if (formatoImpresion == 0 && canPrint==false) {
                notificacion("ASISTENTE IMPRESION",jsrender($('#rd-print-alert')),"growl-danger"); return;
            }

            vendiendo=true;
            btnImprimir.prop("disabled",vendiendo);
            storage.setItem("lastTk",JSON.stringify(cesto));

            socket.sendMessage("venta",{
                m:meta || {},
                v:cesto
            }, function (e, d) {
                vendiendo = false;
                storage.removeItem("lastTk");
                btnImprimir.prop("disabled",vendiendo);
                if (d.hasOwnProperty("code")) {
                    if (d.code==5) notificacion("SORTEOS INVÁLIDOS",sorteosInvalidos(d.sorteos));
                    else if (d.code==6) {
                        notificacion("TOPE TAQUILLA EXEDIDO",topeExedido(d.elementos));
                        d.elementos.forEach(ajustarAtope);
                        cesto_updateView();
                    }
                    else if (d.code==7) {
                        notificacion("TOPE ANIMAL EXEDIDO",topeExedido(d.elementos));
                        d.elementos.forEach(ajustarAtope);
                        cesto_updateView();
                    }
                    else if (d.code==101) notificacion("PLATAFORMA SMS NO DISPONIBLE","La plataforma no se encuentra disponible en estos momentos, por favor intente mas tarde, disculpe las molestias.");
                    else notificacion("TICKET RECHAZADO");
                    return;
                }
                if (d.format=="print") cesto_imprimir(d);
                else cesto_enviado(d);
                cesto_reiniciar();
            })
        }
        function ajustarAtope (item) {
            cesto.forEach(function (c) {
                if (c.sorteoID==item.s && c.numero==item.n) {
                    c.monto = item.tm || item.td;
                    c.tpte = true;

                    if (c.monto==0) {
                        cesto.splice(cesto.indexOf(c),1);
                    }
                }
            });
        }
        function ultimoTicket (ticket) {
            _ultimoTicket = ticket;
            $('#tk-last').html(ticket.ticket.ticketID);
        }

        function cesto_enviado (d) {
            notificacion("VENTA CONFIRMADA","TICKET: #"+ d.tk.ticketID+"<br/><small>CODIGO: "+ d.tk.codigo+"</small>");
            try {
                if (d.vt.length != cesto.length) {
                    alert("ALERTA: VERIFICAR TICKET, PUEDEN HABER CAMBIOS REALIZADOS POR EL SERVIDOR");
                }
                for (var idx = 0; idx < d.vt.length; idx++) {
                    d.vt[idx].sorteo = getSorteo(d.vt[idx].sorteoID).descripcion;
                }

                ultimoTicket({
                    ticket: d.tk,
                    ventas: d.vt
                });
            } catch (err) {
                alert("SRQ HA DETECTADO UN ERROR, Por favor notificar a su administrador. ERROR: "+err.message);
                $('#vnt-ultimo').trigger("click");
            }
        }
        function cesto_imprimir (d) {
            notificacion("VENTA CONFIRMADA","TICKET: #"+ d.tk.ticketID+"<br/><small>CODIGO: "+ d.tk.codigo+"</small>");
            try {
                if (d.vt.length != cesto.length) {
                    alert("ALERTA: VERIFICAR TICKET, PUEDEN HABER CAMBIOS REALIZADOS POR EL SERVIDOR");
                }
                for (var idx = 0; idx < d.vt.length; idx++) {
                    d.vt[idx].sorteo = getSorteo(d.vt[idx].sorteoID).descripcion;
                }

                ultimoTicket({
                    ticket: d.tk,
                    ventas: d.vt
                });

                //imprimir
                var mimp = storage.getItem("srq.taq.modoImpresion") || 1;
                //modo auto
                if (mimp=="atm") mimp = d.vt.length>6?2:1;
                _printStack[mimp](d.vt, d.tk);

            } catch (err) {
                alert("SRQ HA DETECTADO UN ERROR, Por favor notificar a su administrador. ERROR: "+err.message);
                $('#vnt-ultimo').trigger("click");
            }
        }

        function cesto_reiniciar() {
            cesto.length = 0;
            num.focus();
            cesto_updateView(); //TODO optimizar
        }
        function cesto_updateView() {
            cesto.sort(function (a,b) {
                var s1 = a.sorteoID, s2 = b.sorteoID;
                var n1 = a.numero, n2 = b.numero;
                return s1 == s2?n1-n2:s1-s2;
            }); //ordenarlas por sorteo
            $('#vnt-cesta').html(jsrender($('#rd-cesta-row'),cesto,helper));

            var ncono = $('.ncono');
            ncono.mouseover(function () {
                var n = $(this).attr("datan");
                $(this).text((n*100000).format(0)+" BsF");
            });
            ncono.mouseout(function () {
                var n = $(this).attr("datan");
                $(this).text(formatNumber(n,2));
            });

            $('.rem-cesto').click(function (e) {
                e.preventDefault(e);
                var idx = parseInt($(e.currentTarget).attr('indice'));
                cesto.splice(idx,1);
                cesto_updateView();
            });
            var tt = 0;
            cesto.forEach(function (venta) {
                tt += parseFloat(formatNumber(venta.monto,2,'.',''));
            });
            total.html(tt.format(2));
            total.attr('datan',tt.format(2,'.',''));
            cesto.forEach(function (c) { delete c.tpte; });
        }
        function sorteos_updateView() {
            if (config.ordenSorteos==0) $sorteos.sort(sorteos_ordenSorteo);
            else $sorteos.sort(sorteos_ordenCierre);
            sorteos.html(jsrender($('#rd-sorteo-option'),$sorteos.filter(sorteosDisponibles_filtro)));
        }

            function sorteos_ordenSorteo (a,b) {
                var s1 = a.sorteo, s2 = b.sorteo;
                var n1 = a.cierra, n2 = b.cierra;
                return s1 == s2?n1-n2:s1-s2;
            }
            function sorteos_ordenCierre (a,b) {
                var n1 = a.cierra, n2 = b.cierra;
                return n1-n2;
            }

        function elementoCesto (sorteo,numero) {
            for (var i=0;i<cesto.length;i++) {
                if (cesto[i].sorteoID==sorteo && cesto[i].numero==numero) return i;
            }
            return -1;
        }
        function elementoSorteo (sorteo,numero) {
            for (var i=0;i<$elementos.length;i++) {
                if ($elementos[i].s==sorteo && $elementos[i].n==numero) return $elementos[i].id;
            }
            return -1;
        }

        //UI HANDLERES
        $('#vnt-clr').click(cesto_reiniciar);
        btnImprimir.click(function () {
            cesto_realizarVenta();
        });
        $('#vnt-venta').submit(function (e) {
            e.preventDefault(e);
            var data = formControls(this);
            if (data.monto=="" || data.monto === 0) {
                monto.focus();
                return;
            }
            if (typeof(data.numero)!="object" ) {
                data.numero = data.numero.trim();
                data.numero = data.numero.replace(/\*/g," ");
                data.numero = data.numero.split(" ");
                //corrida
                for (var i=data.numero.length-1;i>=0;i--) {
                    if (data.numero[i].indexOf("/")>-1) {
                        var parts = data.numero[i].split("/");
                        parts.sort(function (a,b) {
                            return parseInt(a)-parseInt(b);
                        });
                        data.numero.splice(i,1);
                        var a = parseInt(parts[0]), b = parseInt(parts[1]);
                        var ix = i;
                        for (var n=a;n<=b;n++) {
                            data.numero.splice(ix++,0,padding(n,1));
                        }
                    }
                }
                //corrida
            }
            data.numero.forEach(function (numero) {
                var n = parseInt(numero);
                if (n>0 && n<10) numero = "0"+n;
                data.sorteos.forEach(function (sorteo) {
                    var srt = findBy("sorteoID",sorteo,$sorteos);
                    var num = elementoSorteo(srt.sorteo,numero);
                    if (num>-1) {
                        var idx = elementoCesto(sorteo, num);
                        if (idx > -1) cesto[idx].monto += cono_sel(data.monto);
                        else {
                            cesto.push({
                                numero: num,
                                monto: cono_sel(data.monto),
                                sorteoID: sorteo
                            });
                        }
                    }
                });
            });

            function cono_sel(n) {
                n = (n>1000)?n/100000:n;
                return parseFloat(String(n).substr(0, n.toFixed(2).length));
            }
            cesto_updateView();

            num.val(null).trigger('change');
            if (p=="venta") num.select2('focus');
            else $(num).focus();
            //$('#vnt-monto').val('');
        });

        sorteos.on('change', function (e) {
            var s=null;
            if (e.val && e.val.length>0) {
                s = findBy("sorteoID", e.val[0],$sorteos);
                for (var i = 1; i < e.val.length; i++) {
                    if (s.sorteo!=findBy("sorteoID", e.val[i],$sorteos).sorteo) {
                        s=null; break;
                    }
                }
            }
            if (s) {
                var el = exploreBy("s", s.sorteo, $elementos);
                num.html(jsrender($('#rd-elemento-sorteo-option'),el));
            } else {
                num.html(jsrender($('#rd-elemento-option'),$numeros));
            }
            num.select2("val",null).trigger("change");
        });
        $('#vnt-dia').click(function (e) {
            var d = new Date($servidor.hora);
            nav.url('reporte/diario',[d.format()]);
        });
        $('#vnt-ultimo').click(function () {
            if (canPrint==false) {
                grt = notificacion("ASISTENTE IMPRESION", jsrender($('#rd-print-alert')), "growl-danger", true);
                $('.print-rcn').off('click', onPrint);
                $('.print-rcn').on('click', onPrint);
                return;
            }
            socket.sendMessage("venta-ultima",null, ultimaVenta);

            function ultimaVenta (e, d) {
                if (!d.ventas) return;
                var srt;
                d.ventas.forEach(function (venta) {
                    venta.ventaID = padding(venta.ventaID,6);
                    srt = getSorteo(venta.sorteoID);
                    if (srt) venta.srt = srt.descripcion;
                    else {
                        //TODO: OBTENER SORTEO
                    }
                });
                ultimoTicket(d);

                var mimp = storage.getItem("srq.taq.modoImpresion") || 1;
                if (mimp=="atm") mimp = _ultimoTicket.ventas.length>6?2:1; //modo auto
                _printStack[mimp](_ultimoTicket.ventas, _ultimoTicket.ticket,true);
            }

        });
        $('#ultventa-udp').click(function (e) {
            e.preventDefault(e);
            $('#tk-last').html('<i class="fa fa-spinner fa-spin"></i>');
            socket.sendMessage("venta-ultima",null, ultimaVenta);
        });
        $('#vnt-repetir').submit(function (e) {
            e.preventDefault(e);
            var data = formControls(this);
            cesto.length = 0;
            var srt, num;
            for (var i = 0; i < data.numero.length; i++) {
                srt = findBy("sorteoID",data.sorteo[i],$sorteos);
                num = elementoSorteo(srt.sorteo,data.numero[i]);
                if (num>-1) {
                    cesto.push({
                        numero: num,
                        monto: data.monto[i],
                        sorteoID: data.sorteo[i]
                    });
                } else notificacion("NUMERO INVALIDO","El numero #"+data.numero[i]+" NO EXISTE EN SORTEO SELECCIONADO","growl-danger");
            }
            cesto_updateView();
            $('#md-repetir').modal('hide');
        });
        var _cacherpt;
        $('#repetir').submit(function (e) {
            e.preventDefault(e);
            var data = formControls(this);
            var f = formLock(this);
            socket.sendMessage("venta-repetir",data, function (e, d) {
                formReset(f);
                _cacherpt = d;
                d[0].h=1;
                for (var i=1;i< d.length;i++) {
                    if (d[i].sorteoID!=d[i-1].sorteoID) d[i].h=1;
                }
                $('#vnt-repetir').html(jsrender($('#rd-repetir'),d,helper));
                $('#md-repetir').modal('show');
            })
        });
        $('#md-repetir').on('shown.bs.modal', function (e) {
            var disponibles = $sorteos.filter(sorteosDisponibles_filtro);
            disponibles = disponibles.sort(sorteos_ordenSorteo);
            var s = $('.s2sorteos');
            s.html(jsrender($('#rd-sorteo-option'),disponibles));
            select2w(s);

            var rptplus = $('.rpt-plus');
            var rptminus = $('.rpt-minus');

            disponibles.forEach(function (item,index) {
               $('.srt'+item.sorteoID).select2("val",item.sorteoID);
            });

            /*var mdSorteos = $('#md-msorteos');
            mdSorteos.html(jsrender($('#rd-sorteo-option'),disponibles));*/

            rptplus.click(function () {
                var sid = parseInt($(this).attr("sorteo"));
                var n = _cacherpt.length;
                var srt = $('select.srt'+sid);
                srt.each(function (index, val) {
                    var el = $(this);
                    var v = el.val();
                    var idx = findIndex("sorteoID", v, disponibles);
                    if (idx<disponibles.length-1) el.prop('selectedIndex', idx + 1).change();
                });
            });
            rptminus.click(function () {
                var sid = parseInt($(this).attr("sorteo"));
                var n = _cacherpt.length;
                var srt = $('select.srt'+sid);
                srt.each(function (index, val) {
                    var el = $(this);
                    var v = el.val();
                    var idx = findIndex("sorteoID", v, disponibles);
                    if (idx>0) el.prop('selectedIndex', idx - 1).change();
                });
            });
        });
        sorteos_updateView();

        num.html(jsrender($('#rd-elemento-option'),$numeros));
        sorteos.select2("focus");

        var numInput, sorteoInput;
        $('.select2-input').each(function (index) {
            if (index==1) numInput = this.id;
            if (index==0) sorteoInput = this.id;
        });
        $(document).on("keydown", onKeyDown);

        function onKeyDown (e) {
            console.log("tecla",e.which);
            if (e.altKey) {
                if (e.which>=96 && e.which<=105) {
                    e.preventDefault(e);
                    var n = e.which - 96;
                    cesto.splice(n-1,1);
                    cesto_updateView();
                }
            }
            switch (e.which) {
                case 13: {
                    if (e.target.id==numInput || e.target.id=='vnt-numeros') {
                        e.preventDefault(e);
                        num.select2('close');
                        monto.focus();
                        monto.select();
                    } else if (e.target.id==sorteoInput) {
                        e.preventDefault(e);
                        sorteos.select2('close');
                        num.select2('open');
                        num.focus();
                    }
                    break;
                }
                case parseInt(config.imprimirTecla): { // NUMPAD +
                    e.preventDefault(e);
                    cesto_realizarVenta();
                    sorteos.select2("close");
                    break;
                }
                case 109: { // NUMPAD -
                    e.preventDefault(e);
                    if (cesto.length>0) {
                        cesto.pop();
                        cesto_updateView();
                    } else {
                        num.select2('close');
                        sorteos.val(null).trigger('change');
                        sorteos.select2('open');
                    }
                    break;
                }
                case 36: { //FIN
                    e.preventDefault(e);
                    if (e.target.id==numInput) {
                        num.select2('close');
                        monto.focus();
                        monto.select();
                    } else if (e.target.id==sorteoInput) {
                        sorteos.select2('close');
                        num.select2('open');
                        num.focus();
                    } else {
                        sorteos.select2('open');
                        sorteos.focus();
                    }
                    break;
                }
            }
        }

        var _printStack = [imprimirVentas,imprimirVentas_comp,imprimirVentas_ultra,imprimirVentas_extremo,imprimirVentas_comprobante];
        function imprimirVentas(cesto,ticket,copia) {
            copia = copia || false;
            var _lineas = [
                {type:"linea",text:$usuario.nombre,align:"center"},
                {type:"linea",text:ticket.hora,align:"center"},
                {type:"linea",text:"S:"+padding(ticket.ticketID,6)+" C:"+padding(ticket.codigo)+" N:"+cesto.length,align:"center"}
            ];
            if (copia) {
                _lineas.push({type:"linea",text:"S:"+padding(ticket.ticketID,6)+" N:"+cesto.length,align:"center"});
                _lineas.push({type:"linea",text:"COPIA - CADUCA 3 DIAS",align:"center"});
            }
            else {
                _lineas.push({type:"linea",text:"S:"+padding(ticket.ticketID,6)+" C:"+padding(ticket.codigo)+" N:"+cesto.length,align:"center"});
                _lineas.push({type:"linea",text:"TICKET - CADUCA 3 DIAS",align:"center"});
            }

            cesto.sort(function (a,b) {
                var s1 = a.sorteoID, s2 = b.sorteoID;
                var n1 = a.numero, n2 = b.numero;
                return s1 == s2?n1-n2:s1-s2;
            }); //ordenarlas por sorteo
            var linea = cesto[0], el;
            _lineas.push({type:"linea",text:linea.sorteo,align:"center"});
            for (var i=0;i<cesto.length;i++) {
                if (linea.sorteoID!=cesto[i].sorteoID) {
                    _lineas.push({type:"linea",text:cesto[i].sorteo,align:"center"});
                }
                linea = cesto[i];
                el = getElemento(linea.num || linea.numero);
                _lineas.push({type:"linea",text:["#"+el.n,el.d,formatNumber(linea.monto,2)].join("\t "),align:"center"});
            }

            _lineas.push({type:"linea",text:"T:"+ticket.monto.format(2)+" AG"+_fingerprint,align:"left"});
            //_lineas.push({type:"linea",text:"CADUCA EN 3 DIAS",align:"center"});
            _lineas.push({type:"linea",text:" ",align:"left"});

            print.sendMessage("print",{data:_lineas,printer:1});
        }
        function imprimirVentas_comp (cesto,ticket,copia) {
            copia = copia || false;
            var _lineas = [
                {type:"linea",text:$usuario.nombre,align:"center"},
                {type:"linea",text:ticket.hora,align:"center"}
            ];
            if (copia) {
                _lineas.push({type:"linea",text:"S:"+padding(ticket.ticketID,6)+" N:"+cesto.length,align:"center"});
                _lineas.push({type:"linea",text:"COPIA - CADUCA 3 DIAS",align:"center"});
            }
            else {
                _lineas.push({type:"linea",text:"S:"+padding(ticket.ticketID,6)+" C:"+padding(ticket.codigo)+" N:"+cesto.length,align:"center"});
                _lineas.push({type:"linea",text:"TICKET - CADUCA 3 DIAS",align:"center"});
            }

            cesto.sort(function (a,b) {
                var s1 = a.sorteoID, s2 = b.sorteoID;
                var n1 = a.numero, n2 = b.numero;
                return s1 == s2?n1-n2:s1-s2;
            }); //ordenarlas por sorteo
            var linea = cesto[0], el;
            var ldata = []; var hdata = []; var lo = {}, hi= 0, li= 0, ci=1;
            //_lineas.push({type:"linea",text:linea.sorteo,align:"center"});
            hdata[hi] = [{field:"l1",text:linea.sorteo,width:"50"},{field:"l2",text:" ",width:"50"}];
            ldata[li] = [];
            for (var i=0;i<cesto.length;i++) {
                if (linea.sorteoID!=cesto[i].sorteoID) {
                    //_lineas.push({type:"linea",text:cesto[i].sorteo,align:"center"});
                    if (ci==2) ldata[li].push(lo);
                    _lineas.push({type:"tabla",header:false,columns:hdata[hi++],data:ldata[li++]});

                    hdata[hi] = [{field:"l1",text:cesto[i].sorteo,width:"50"},{field:"l2",text:" ",width:"50"}];
                    ldata[li] = [];

                    ci=1; lo = {};
                }
                linea = cesto[i];
                el = getElemento(linea.num || linea.numero);
                if (ci==2) {
                    ci=1;
                    lo.l2 = (el.n=="0"?"0  ":el.n)+" "+el.d.substr(0,3)+" "+formatNumber(linea.monto,2);
                    ldata[li].push(lo);
                    lo={};
                } else {
                    ci=2;
                    lo.l1 = (el.n=="0"?"0  ":el.n)+" "+el.d.substr(0,3)+" "+formatNumber(linea.monto,2);
                    lo.l2 = " ";
                }
            }
            if (ci==2) ldata[li].push(lo);
            _lineas.push({type:"tabla",header:false,columns:hdata[hi++],data:ldata[li++]});

            _lineas.push({type:"linea",text:"T:"+ticket.monto.format(2)+" AG"+_fingerprint,align:"left"});
            _lineas.push({type:"linea",text:" ",align:"left"});

            print.sendMessage("print",{data:_lineas,printer:1});
        }
        function imprimirVentas_ultra (cesto,ticket,copia) {
            copia = copia || false;
            var _lineas = [
                {type:"linea",text:$usuario.nombre,align:"center"},
                {type:"linea",text:ticket.hora,align:"center"}
            ];
            if (copia) {
                _lineas.push({type:"linea",text:"S:"+padding(ticket.ticketID,6)+" N:"+cesto.length,align:"center"});
                _lineas.push({type:"linea",text:"COPIA - CADUCA 3 DIAS",align:"center"});
            }
            else {
                _lineas.push({type:"linea",text:"S:"+padding(ticket.ticketID,6)+" C:"+padding(ticket.codigo)+" N:"+cesto.length,align:"center"});
                _lineas.push({type:"linea",text:"TICKET - CADUCA 3 DIAS",align:"center"});
            }

            cesto.sort(function (a,b) {
                var s1 = a.sorteoID, s2 = b.sorteoID;
                var n1 = a.numero, n2 = b.numero;
                return s1 == s2?n1-n2:s1-s2;
            }); //ordenarlas por sorteo
            var colw=33;
            var linea = cesto[0], el;
            var ldata = []; var hdata = []; var lo = {}, hi= 0, li= 0, ci=1;
            //_lineas.push({type:"linea",text:linea.sorteo,align:"center"});
            hdata[hi] = [
                {field:"l1",text:linea.sorteo,width:colw},
                {field:"l2",text:" ",width:colw},
                {field:"l3",text:" ",width:colw}];
            ldata[li] = [];
            for (var i=0;i<cesto.length;i++) {
                if (linea.sorteoID!=cesto[i].sorteoID) {
                    //_lineas.push({type:"linea",text:cesto[i].sorteo,align:"center"});
                    if (ci<4) ldata[li].push(lo);
                    _lineas.push({type:"tabla",header:false,columns:hdata[hi++],data:ldata[li++]});

                    hdata[hi] = [{field:"l1",text:cesto[i].sorteo,width:colw},{field:"l2",text:" ",width:colw},{field:"l3",text:" ",width:colw}];
                    ldata[li] = [];

                    ci=1; lo = {};
                }
                linea = cesto[i];
                el = getElemento(linea.num || linea.numero);
                if (ci==3) {
                    ci=1;
                    lo.l3 = [el.n+"x"+formatNumber(linea.monto,2)].join("\t ");
                    ldata[li].push(lo);
                    lo={};
                } else if (ci==2) {
                    ci++;
                    lo.l2 = [el.n+"x"+formatNumber(linea.monto,2)].join("\t ");
                } else {
                    ci++;
                    lo.l1 = [el.n+"x"+formatNumber(linea.monto,2)].join("\t ");
                    lo.l2 = " ";
                    lo.l3 = " ";
                }
            }
            if (ci==2 || ci==3) ldata[li].push(lo);
            _lineas.push({type:"tabla",header:false,columns:hdata[hi++],data:ldata[li++]});

            _lineas.push({type:"linea",text:"T:"+ticket.monto.format(2)+" AG"+_fingerprint,align:"left"});
            _lineas.push({type:"linea",text:" ",align:"left"});

           print.sendMessage("print",{data:_lineas,printer:1});
        }
        function imprimirVentas_extremo (cesto,ticket,copia) {
            copia = copia || false;
            var _lineas = [
                {type:"linea",text:$usuario.nombre,align:"center"},
                {type:"linea",text:ticket.hora,align:"center"}
            ];
            if (copia) {
                _lineas.push({type:"linea",text:"S:"+padding(ticket.ticketID,6)+" N:"+cesto.length,align:"center"});
                _lineas.push({type:"linea",text:"COPIA - CADUCA 3 DIAS",align:"center"});
            }
            else {
                _lineas.push({type:"linea",text:"S:"+padding(ticket.ticketID,6)+" C:"+padding(ticket.codigo)+" N:"+cesto.length,align:"center"});
                _lineas.push({type:"linea",text:"TICKET - CADUCA 3 DIAS",align:"center"});
            }

            cesto.sort(function (a,b) {
                var s1 = a.sorteoID, s2 = b.sorteoID;
                var n1 = a.numero, n2 = b.numero;
                return s1 == s2?n1-n2:s1-s2;
            }); //ordenarlas por sorteo

            var linea = cesto[0], el;
            var csorteo = [];
            for (var i=0;i<cesto.length;i++) {
                if (linea.sorteoID != cesto[i].sorteoID) {
                    _lineas.push({type:"linea",text:linea.sorteo,align:"left"});
                    csorteo.sort(cesto_ordenMonto);
                    cesto_print(csorteo,_lineas);
                    csorteo = [];
                }
                csorteo.push(cesto[i]);
                linea = cesto[i];
            }
            _lineas.push({type:"linea",text:linea.sorteo,align:"left"});
            csorteo.sort(cesto_ordenMonto);
            cesto_print(csorteo,_lineas);

            //_lineas.push({type:"linea",text:"TOTAL: "+ticket.monto,align:"center"});
            _lineas.push({type:"linea",text:"T:"+ticket.monto.format(2)+" AG"+_fingerprint,align:"left"});
            _lineas.push({type:"linea",text:" ",align:"left"});

            print.sendMessage("print",{data:_lineas,printer:1});
        }
        function imprimirVentas_comprobante (cesto,ticket,copia) {
            copia = copia || false;
            var _lineas = [
                {type:"linea",text:$usuario.nombre,align:"center"},
                {type:"linea",text:ticket.hora,align:"center"}
            ];
            if (copia) {
                _lineas.push({type:"linea",text:"S:"+padding(ticket.ticketID,6)+" N:"+cesto.length,align:"center"});
            }
            else {
                _lineas.push({type:"linea",text:"S:"+padding(ticket.ticketID,6)+" C:"+padding(ticket.codigo)+" N:"+cesto.length,align:"center"});
            }
            _lineas.push({type:"linea",text:"T:"+ticket.monto.format(2)+" AG"+_fingerprint,align:"left"});
            _lineas.push({type:"linea",text:" ",align:"left"});
            print.sendMessage("print",{data:_lineas,printer:1});
        }
        function cesto_print (c,cursor) {
            var tx;
            var e = c[0]; var n = []; var el;
            for (var i=0;i< c.length;i++) {
                if (c[i].monto!= e.monto) {
                    parseItems(n,e);
                    n=[];
                }
                el = getElemento(c[i].num || c[i].numero);
                n.push(el.n);
                e = c[i];
            }
            //ultimo grupo jugadas
            parseItems(n,e);

            function parseItems (n,e) {
                var a, b,c;
                tx = zip_series(n).join(",")+"x"+e.monto;
                var atx = tx.split(",");
                while (atx.length>0) {
                    var ni = config.letrasLinea/3;
                    tx = atx.splice(0,ni).join(",");
                    a = cursor[cursor.length-1].text.length;
                    b = tx.length; c = a+b;
                    if (c>config.letrasLinea) {
                        if (b<=config.letrasLinea) cursor.push({type:"linea",text:tx,align:"left"});
                        else {
                            var ci = tx.indexOf(",",22);
                            if (ci==-1) ci = tx.indexOf("x");
                            cursor.push({type:"linea",text:tx.substr(0,ci)+"-",align:"left"});
                            cursor.push({type:"linea",text:tx.substr(ci),align:"left"});
                        }
                    } else {
                        cursor[cursor.length-1].text += ";"+tx;
                    }
                }
            }
        }

        function cesto_ordenMonto (a,b) {
            var s1 = a.monto, s2 = b.monto;
            var n1 = a.numero, n2 = b.numero;
            return s1 == s2?n1-n2:s1-s2;
        }
        function zip_series (a) {
            var b = [a[0]];
            var a1,a2,ls;
            for (var i =1; i< a.length; i++) {
                a1 = parseInt(a[i]); a2 = parseInt(a[i-1])+1;
                if (a1!=a2) {
                    if (b[b.length-1]!=a[i-1]) b[b.length-1] += "al"+a[i-1];
                    b.push(a[i]);
                }
            }
            if (a1==a2) {
                if (b[b.length-1]!=a[i-1]) b[b.length-1] += "al"+a[i-1];
            }
            return b;
        }
        //test
        if (args && args.length>0) {
            var repeat = args[1] || 10;
            var montot = 0;
            var r= 0;
            var _sorteos = $sorteos.filter(sorteosDisponibles_filtro);
            var tm = new Date().getTime();
            function bot_venta() {
                var ns = getRandomInt(1, _sorteos.length);
                //var ns = 10;
                var t = [];
                for (var i = 0; i < ns; i++) {
                    var sr = _sorteos[parseInt(Math.random() * _sorteos.length)];
                    //var sr = _sorteos[0]; //ruleta 10am
                    var elm = exploreBy("s",sr.sorteo,$elementos);
                    var nn = parseInt(Math.random() * elm.length);
                    var v = {
                        monto: parseFloat(getRandomArbitrary(0.10, 10).toFixed(2)),
                        //monto: 1000,
                        numero: elm[nn].id,
                        sorteoID: sr.sorteoID
                    };
                    montot += v.monto;
                    t.push(v);
                }
                var vkey = (new Date).getTime();
                socket.sendMessage("venta", {v:t}, function (e, d) {
                    /*if (d.vt.length!= t.length) {
                        alert("ALERTA: VERIFICAR TICKET, PUEDE ESTAR DEFECTUOSO");
                    }*/
                    $('#bot').html((++r)+" de "+repeat+" ventas confirmadas, con "+montot.format(2)+" bs");
                    if (r<repeat) bot_venta();
                    else $('#bot').append(',en '+(new Date().getTime()-tm)+" ms");
                });
            }
            bot_venta();
        }
    }

    function sorteoBuscar_nav(p,args) {
        $('#sorteo-buscar').submit(function (e) {
            e.preventDefault(e);
            var data = formControls(this);
            var f = formLock(this);
            socket.sendMessage("sorteos",data, function (e, d) {
                formLock(f,false);
                $('#sorteos-body').html(jsrender($('#rd-sorteo-row'),d || []));
            })
        })
    }
    nav.paginas.addListener("sorteos/buscar",sorteoBuscar_nav);

    function reporteDiario_nav (p,args) {
        var rpt;
        var j=0, pg= 0, pr = 0, cm = 0;

        var rf = $('#reporte-fecha');
        var help = {
            sorteo: function (id) {
                var sorteo = findBy("sorteoID",id,$sorteos);
                return sorteo?sorteo.descripcion:padding(id,6);
            },
            format:formatNumber
        };

        $('#reporte').submit(function (e) {
            e.preventDefault(e);
            var data = formControls(this);
            var f = formLock(this);
            socket.sendMessage("reporte-diario",data, function (e, d) {
                formLock(f,false);
                rpt = d || [];
                j=0; pg=0; pr=0;
                rpt.forEach(function (item) {
                    j+=item.jugado;
                    pg+=item.pago;
                    pr+=item.premio;
                });

                $('#mnt-jugado').html(j.format(2));
                $('#mnt-premios').html(pr.format(2));
                $('#mnt-pagos').html(pg.format(2));
                $('#mnt-balance').html((j-pr).format(2));

                $('#mnt-pendiente').html((pr-pg).format(2));
                $('#mnt-ppagos').html(((pg/pr)*100).format(2));

                $('#reporte-body').html(jsrender($('#rd-reporte-diario'),d,help));
            })
        });
        $('#print-reporte').click(function () {
            var now = new Date();

            var _lineas = [
                {type:"linea",text:$usuario.nombre,align:"center"},
                {type:"linea",text:now.format('yy-mm-dd')+" "+now.format('TZ:240 h:MM:s TT'),align:"center"},
                {type:"linea",text:"REPORTE DIARIO",align:"center"}
            ];

            _lineas.push({type:"linea",text:"JUGADO: "+j.format(2),align:"left"});
            _lineas.push({type:"linea",text:"PREMIOS: "+pr.format(2),align:"left"});
            _lineas.push({type:"linea",text:"PAGOS: "+pg.format(2),align:"left"});
            _lineas.push({type:"linea",text:"PENDIENTE: "+(pr-pg).format(2),align:"left"});
            _lineas.push({type:"linea",text:"BALANCE: "+(j-pr).format(2),align:"left"});
            _lineas.push({type:"linea",text:" ",align:"left"});

            print.sendMessage("print",{data:_lineas,printer:1});
        });

        if (args && args.length==1) {
            var a = args[0].split("-");
            rf.datepicker('setDate',new Date(a[0],parseInt(a[1])-1,a[2]));
            $('#reporte').trigger("submit");
        }
    }
    nav.paginas.addListener('reporte/diario',reporteDiario_nav);

    function reporteGeneral_nav (p,args) {
        var prm = $('#prm-select');
        var rpt;
        var j, pg, pr, cm, b;
        $('#reporte').submit(function (e) {
            e.preventDefault(e);
            var form = formLock(this);
            var data = formControls(this);
            socket.sendMessage("reporte-general",data, function (e, d) {
                formLock(form,false);
                rpt = d || [];
                updateView();
            })
        });

        prm.change(updateView);
        $('#print-reporte').click(function () {
            var now = new Date();

            rpt.forEach(function (item) {
                item.desc = item.descripcion.substr(-8);
            });

            var _lineas = [
                {type:"linea",text:$usuario.nombre,align:"center"},
                {type:"linea",text:now.format('yy-mm-dd')+" "+now.format('TZ:240 h:MM:s TT'),align:"center"},
                {type:"linea",text:"REPORTE GENERAL",align:"center"}
            ];
            _lineas.push({type:"linea",text:rpt[0].descripcion+" - "+rpt[rpt.length-1].descripcion,align:"center"});
            if (prm.val()==0) {
                _lineas.push({type:"linea",text:"**PREMIOS PAGADOS**",align:"center"});
                pr=pg;
                _lineas.push({type:"tabla",data:rpt,header:true,columns:[
                    {text:"FECHA",field:"desc",width:25},
                    {text:"JUGADO",field:"jugada",width:25},
                    {text:"PREMIO",field:"pago",width:25},
                    {text:"BALANCE",field:"balance",width:25}
                ]});
            } else {
                _lineas.push({type:"tabla",data:rpt,header:true,columns:[
                    {text:"FECHA",field:"desc",width:25},
                    {text:"JUGADO",field:"jugada",width:25},
                    {text:"PREMIO",field:"premio",width:25},
                    {text:"BALANCE",field:"balance",width:25}
                ]});
            }

            _lineas.push({type:"linea",text:" ",align:"left"});
            _lineas.push({type:"linea",text:"JUGADO: "+j.format(2),align:"left"});
            _lineas.push({type:"linea",text:"PREMIOS: "+pr.format(2),align:"left"});
            _lineas.push({type:"linea",text:"COMISION: "+cm.format(2),align:"left"});
            _lineas.push({type:"linea",text:"BALANCE: "+(j-pr-cm).format(2),align:"left"});
            _lineas.push({type:"linea",text:" ",align:"left"});

            print.sendMessage("print",{data:_lineas,printer:1});
        });

        function updateView() {
            j=0, pg= 0, pr= 0, cm = 0, b=0;

            $('.clr-val').html('--');
            $('#reporte-body').html('');
            rpt.forEach(function (item) {
                item.balance = item.jugada-(prm.val()==0?item.pago:item.premio);

                b+=item.balance;
                j+=item.jugada;
                pg+=item.pago;
                pr+=item.premio;
                cm+= item.comision;
            });

            $('#mnt-jugado').html(j.format(2));
            $('#mnt-premios').html(pr.format(2));
            $('#mnt-pagos').html(pg.format(2));
            $('#mnt-balance').html((b-cm).format(2));

            $('#comision').html(cm.format(2));
            $('#mnt-neto').html((b).format(2));

            if (rpt.length==0) return;

            if (prm.val()==0) $('#reporte-body').html(jsrender($('#rd-reporte-diario'), rpt, hlp));
            else $('#reporte-body').html(jsrender($('#rd-reporte-diario2'), rpt, hlp));
        }

    }
    nav.paginas.addListener('reporte/general',reporteGeneral_nav);

    function reporteSorteo_nav (p,args) {
        var help = {
            elm:function (n) {
                var e = findBy("id",n,$elementos);
                return e? e.descripcion:n;
            },pago: function (p) {
                return p>0?"SI":"NO";
            },
            padding:padding,
            dateFormat:dateFormat
        };

        var rf = $('#reporte-fecha');
        rf.change(function (e) {
            socket.sendMessage("sorteos",{nombres: e.target.value}, function (e, d) {
                $('#sorteos').html(jsrender($('#rd-sorteo-option'),d));
            })
        });
        rf.trigger("change");


        $('#reporte').submit(function (e) {
            e.preventDefault(e);
            var data = formControls(this);
            var f = formLock(this);

            $('#reporte-vnt').html('');
            $('#reporte-elm').html('');
            socket.sendMessage("reporte-sorteo",data, function (e, d) {
                formLock(f,false);
                d.vnt = d.vnt || [];
                var j=0, pr=0, pg=0;
                var nan=0, npr=0, npg=0;
                d.vnt.forEach(function (item) {
                    if (item.anulado==0) {
                        j+=item.monto;
                        pr+=item.premio;
                        pg+= item.pago>0?item.premio:0;
                        if (item.premio>0) npr++;
                        if (item.pago>0) npg++;
                        if (item.anulado==1) nan++;
                    }
                });

                $('#mnt-jugado').html(j.format(2));
                $('#mnt-premios').html(pr.format(2));
                $('#mnt-pagos').html(pg.format(2));
                $('#tk-total').html(d.vnt.length);
                $('#tk-premios').html(npr);
                $('#tk-pagos').html(npg);

                $('#reporte-vnt').html(jsrender($('#rd-reporte-vnt'), d.vnt));

                $('.fticket').click(function () {
                    var md = $('#md-ticket');
                    var val = $(this).data('id');
                    md.on('shown.bs.modal', function (e) {
                        md.off('shown.bs.modal',arguments.callee);
                        var input = $('#md-pagar-ticket');
                        input.val(parseInt(val));
                        input.focus();
                    });
                    md.modal('show');
                });
            })
        });

        if (args && args.length>0) {

        }
    }
    nav.paginas.addListener('reporte/sorteo',reporteSorteo_nav);

    function reporteVentas_nav (p,args) {
        var rpt;
        var j=0, pg= 0, pr = 0, an = 0, anm = 0;

        var rf = $('#reporte-fecha');
        var body = $('#reporte-body');
        var nav = $('#nav-table');
        var all = [];

        $('#rpt-vpremio').click(function () {
            var d = all.filter(function (item) {
                return item.pr>0;
            });
            updateBody(d);
            $('.nav-btn').addClass("disabled");
        });
        $('#rpt-vjugado').click(function () {
            updateBody(rpt[cindex]);
            $('.nav-btn').removeClass("disabled");
        });
        $('#rpt-vanulado').click(function () {
            var d = all.filter(function (item) {
                return item.a>0;
            });
            updateBody(d);
            $('.nav-btn').addClass("disabled");
        });
        $('#rpt-vpend').click(function () {
            var d = all.filter(function (item) {
                return item.pg<item.pr;
            });
            updateBody(d);
            $('.nav-btn').addClass("disabled");
        });
        $('#rpt-vpagos').click(function () {
            var d = all.filter(function (item) {
                return item.pg>0;
            });
            updateBody(d);
            $('.nav-btn').addClass("disabled");
        });

        $('#reporte').submit(function (e) {
            e.preventDefault(e);
            all.length=0;
            j=0; pg=0; pr=0; an=0; anm=0;

            var data = formControls(this);
            var f = formLock(this);
            resetForm();
            socket.sendMessage("reporte-ventas",data, function (e, d) {
                if (!d.last) socket.addListener('reporte-ventas',prefetch);
                all = d.data || [];
                formLock(f,false);
                if (d.data) {
                    rpt = [d.data];
                    updateTotal(d.data);
                    updateBody(d.data);
                    nav.html('<button class="btn btn-primary nav-btn">1</button>');
                }
            })
        });
        function resetForm() {
            body.html('');
            nav.html('');
            $('.es-reset').html('--');
            nindex=1; cindex=0;
        }
        var nindex= 1, cindex=0;
        function prefetch (e,d) {
            if (d.data) {
                rpt.push(d.data);
                all = all.concat(d.data);
                updateTotal(d.data);
                nav.append('<button class="btn btn-default nav-btn">' + (++nindex) + '</button>');
            }
            if (d.last) {
                socket.removeListener('reporte-ventas',prefetch);
                $('.nav-btn').click(function () {
                    var b = $(this);
                    cindex = parseInt(b.html())-1;
                    if (b.hasClass('btn-default')) {
                        $('.nav-btn').switchClass('btn-primary','btn-default');
                        b.switchClass('btn-default','btn-primary');
                        updateBody(rpt[cindex]);
                    }
                });
            }
        }
        function updateBody (d) {
            body.html(jsrender($('#rd-reporte-diario'), d));
            $('.fticket').click(function () {
                var md = $('#md-ticket');
                var val = $(this).data('id');
                md.on('shown.bs.modal', function (e) {
                    md.off('shown.bs.modal',arguments.callee);
                    var input = $('#md-pagar-ticket');
                    input.val(parseInt(val));
                    input.focus();
                });
                md.modal('show');
            });
        }
        function updateTotal (d) {
            if (!d) return;
            d.forEach(function (item) {
                if (item.a==0) {
                    j+=item.m;
                    pg+=item.pg;
                    pr+=item.pr;
                } else {
                    an++;
                    anm+=item.m;
                }
            });

            var cm = (j*$usuario.comision*0.01);
            $('#mnt-jugado').html(j.format(2));
            $('#mnt-premios').html(pr.format(2));
            $('#mnt-pagos').html(pg.format(2));
            $('#mnt-balance').html((j-pr-cm).format(2));
            $('#mnt-comision').html((cm).format(2));

            $('#mnt-pendiente').html((pr-pg).format(2));
            $('#mnt-ppagos').html(((pg/pr)*100).format(2));
            $('#mnt-tanulados').html(an.format(2));
            $('#mnt-anulados').html(anm.format(2));
        }

        $('#print-reporte').click(function () {
            var now = new Date();

            var _lineas = [
                {type:"linea",text:$usuario.nombre,align:"center"},
                {type:"linea",text:now.format('yy-mm-dd')+" "+now.format('TZ:240 h:MM:s TT'),align:"center"},
                {type:"linea",text:"REPORTE TICKETS",align:"center"}
            ];

            _lineas.push({type:"linea",text:"JUGADO: "+j.format(2),align:"left"});
            _lineas.push({type:"linea",text:"PREMIOS: "+pr.format(2),align:"left"});
            _lineas.push({type:"linea",text:"PAGOS: "+pg.format(2),align:"left"});
            _lineas.push({type:"linea",text:"PENDIENTE: "+(pr-pg).format(2),align:"left"});
            _lineas.push({type:"linea",text:"BALANCE: "+(j-pg).format(2),align:"left"});
            _lineas.push({type:"linea",text:" ",align:"left"});

            print.sendMessage("print",{data:_lineas,printer:1});
        });

        if (args && args.length==1) {
            var a = args[0].split("-");
            rf.datepicker('setDate',new Date(a[0],parseInt(a[1])-1,a[2]));
            $('#reporte').trigger("submit");
        }
    }
    nav.paginas.addListener("reporte/ventas",reporteVentas_nav);

    function preferencias_nav(p,args) {
        var modoImpresion = $('#md-impresion');
        var formatoImpresion = $('#ft-impresion');
        var letrasLinea = $('#lt-linea');
        var ordenSorteo = $('#md-orden');

        modoImpresion.change(function (e) {
            storage.setItem("srq.taq.modoImpresion",modoImpresion.val());
        });
        var mi = storage.getItem("srq.taq.modoImpresion");
        modoImpresion.select2("val",mi || 1);
        modoImpresion.val(mi || 1);

        formatoImpresion.change(function (e) {
            setConfig("formatoImpresion",formatoImpresion.val());
        });
        var fi = storage.getItem("srq.taq.formatoImpresion");
        formatoImpresion.select2("val",fi || 0);
        formatoImpresion.val(fi || 0);

        letrasLinea.val(config.letrasLinea);
        $('#btnletras').click(function () {
            setConfig("letrasLinea",letrasLinea.val());
            notificacion("Letras Linea",'Cambio exitoso');
        });

        ordenSorteo.select2("val",config.ordenSorteos || 0);
        ordenSorteo.val(config.ordenSorteos);
        ordenSorteo.change(function (e) {
            setConfig("ordenSorteos",ordenSorteo.val());
        });

        $('#prf-ticketPrueba').click(function (e) {
            var _lineas = [
                [{"type":"linea","text":"AG. DEMO","align":"center"},{"type":"linea","text":"04/06/17 06:12:14 AM","align":"center"},{"type":"linea","text":"9999999-1234","align":"center"},{"type":"linea","text":"TICKET PRUEBA","align":"center"},{"type":"linea","text":"RULETA ACTIVA 10AM","align":"center"},{"type":"linea","text":"#0\t DELFIN\t 99999","align":"center"},{"type":"linea","text":"#01\t CARNERO\t 99999","align":"center"},{"type":"linea","text":"#02\t TORO\t 99999","align":"center"},{"type":"linea","text":"#03\t CIEMPIES\t 99999","align":"center"},{"type":"linea","text":"#04\t ALACRAN\t 99999","align":"center"},{"type":"linea","text":"#05\t LEON\t 99999","align":"center"},{"type":"linea","text":"#06\t RANA\t 99999","align":"center"},{"type":"linea","text":"#07\t PERICO\t 99999","align":"center"},{"type":"linea","text":"#08\t RATON\t 99999","align":"center"},{"type":"linea","text":"#09\t AGUILA\t 99999","align":"center"},{"type":"linea","text":"TOTAL: 999990","align":"center"},{"type":"linea","text":"CADUCA EN 3 DIAS","align":"center"},{"type":"linea","text":"c8dda1ff1abe1e7ddd1042a2213b3da0","align":"center"},{"type":"linea","text":" ","align":"left"}],
                [{"type":"linea","text":"AG. DEMO","align":"center"},{"type":"linea","text":"04/06/17 06:12:14 AM","align":"center"},{"type":"linea","text":"9999999-1234","align":"center"},{"type":"linea","text":"TICKET PRUEBA","align":"center"},{"type":"tabla","header":false,"columns":[{"field":"l1","text":"RULETA ACTIVA 10AM","width":"50"},{"field":"l2","text":" ","width":"50"}],"data":[{"l1":"0\tDELF\t99999","l2":"01\tCARN\t99999"},{"l1":"02\tTORO\t99999","l2":"03\tCIEM\t99999"},{"l1":"04\tALAC\t99999","l2":"05\tLEON\t99999"},{"l1":"06\tRANA\t99999","l2":"07\tPERI\t99999"},{"l1":"08\tRATO\t99999","l2":"09\tAGUI\t99999"}]},{"type":"linea","text":"TOTAL: 999990","align":"center"},{"type":"linea","text":"CADUCA EN 3 DIAS","align":"center"},{"type":"linea","text":"c8dda1ff1abe1e7ddd1042a2213b3da0","align":"center"},{"type":"linea","text":" ","align":"left"}],
                [{"type":"linea","text":"AG. DEMO","align":"center"},{"type":"linea","text":"04/06/17 06:12:14 AM","align":"center"},{"type":"linea","text":"9999999-1234","align":"center"},{"type":"linea","text":"TICKET PRUEBA","align":"center"},{"type":"tabla","header":false,"columns":[{"field":"l1","text":"RULETA ACTIVA 10AM","width":33},{"field":"l2","text":" ","width":33},{"field":"l3","text":" ","width":33}],"data":[{"l1":"0x99999","l2":"01x99999","l3":"02x99999"},{"l1":"03x99999","l2":"04x99999","l3":"05x99999"},{"l1":"06x99999","l2":"07x99999","l3":"08x99999"},{"l1":"09x99999","l2":" ","l3":" "}]},{"type":"linea","text":"TOTAL: 999990","align":"center"},{"type":"linea","text":"CADUCA EN 3 DIAS","align":"center"},{"type":"linea","text":"c8dda1ff1abe1e7ddd1042a2213b3da0","align":"center"},{"type":"linea","text":" ","align":"left"}]
            ];
            var mimp = storage.getItem("srq.taq.modoImpresion") || 0;
            if (mimp=="atm") mimp = 2;

            print.sendMessage("print",{data:_lineas[mimp],printer:1})
        });

        var bprint = $('#btnimprimir');
        var scprint = $('#scimprimir');
        scprint.val(getKeyName(config.imprimirTecla));
        bprint.click(function (e) {
            $(document).on("keydown",keydown_handler);
            bprint.html("Presione una tecla...");

            function keydown_handler (e) {
                $(document).off("keydown",keydown_handler);
                if ( !e.metaKey ) {
                    e.preventDefault();
                }
                var key = getKeyName(e.keyCode);
                if (key) {
                    scprint.val(key);
                    setConfig("imprimirTecla", e.keyCode);
                }
                bprint.html("Editar");
            }
        });
    }
    nav.paginas.addListener("preferencias",preferencias_nav);

    function ayuda_nav (p,args) {
        var indice = ['#ayuda-venta','#ayuda-pago','#ayuda-anular'];
        if (args.length>0) {
            var index = args[0];
            $('html, body').animate({scrollTop: $(indice[index]).offset().top}, 1000);
        }
    }
    nav.paginas.addListener("ayuda",ayuda_nav);

// MAIN //
    var ntfbuttonidx=0;
    function main_initSocket() {
        socket = new Net("ws://"+host,false);
        socket.addListener(NetEvent.SOCKET_OPEN,socket_OPEN);
        socket.addListener(NetEvent.LOGIN,socket_LOGIN);
        socket.addListener("duplicado",socket_duplicado);
        socket.addListener("close-mant",socket_closing);
        socket.addListener(NetEvent.SOCKET_CLOSE,socket_CLOSE);
        socket.addListener("init",init);
        socket.addListener("fingerprint",fingerprint);
        socket.addListener(NetEvent.DATA_CHANGE, function () {
            $('#main-bin').text(Net.parseBytes(socket.bytesIn));
            $('#main-bout').text(Net.parseBytes(socket.bytesOut));
        });
        socket.addListener("venta-anular-banca", function (e,d) {
            notificacion('TICKET ANULADO POR BANCA','TICKET #'+d,'growl-success',true);
        });
        socket.addListener("sorteos-update", function (e, d) {
            $sorteos = d.sorteos;
        });
        socket.addListener("estatus-change", function (e, d) {
            var cierra = d.cierra?"CIERRA":"ABRE";
            var sorteo = findBy("sorteoID", d.sorteoID,$sorteos);
            if (sorteo) notificacion("SISTEMA","SORTEO <strong>"+sorteo.descripcion+"</strong> "+cierra);
        });
        socket.addListener('srt-premio', function (e, d) {
            var sorteo = findBy('sorteoID', d.sorteoID, $sorteos);
            var elemento = findBy('id', d.ganador, $elementos);
            if (sorteo) notificacion("PREMIOS RECIBIDOS","SORTEO: "+sorteo.descripcion+"</br>#"+ elemento.n+" "+elemento.d,null,false);
        });
        socket.addListener('metas', function (e, d) {
            $meta = d;

            if ($meta.hasOwnProperty("msg_init") && $meta.msg_init.length>0) {
                notificacion('MENSAJE BANCA',$meta.msg_init,'',true);
            }
            if ($meta.hasOwnProperty("msg_srv") && $meta.msg_srv.length>0) {
                notificacion('MENSAJE SERVIDOR',$meta.msg_srv,'',true);
            }
        });
        socket.connect();
    }
    main_initSocket();

    var _fingerprint;
    var _urfinger;
    var _timer=0;
    function init (e,d) {
        $servidor.hora = d.t;

        if (storage.fpud62737hdh2==null) {
            storage.fpud62737hdh2 = cliente.getFingerprint();
        }
        _fingerprint = storage.fpud62737hdh2;
        _urfinger = md5(_fingerprint.toString() + d.t);

        //validar hora servidor-cliente
        if (_timer>0) clearInterval(_timer);
        _timer = setInterval(function () {
            $servidor.hora += 1000;
        },1000);

        var loginCache = storage.getItem("loto_taqlogin");
        if (loginCache) {
            login(JSON.parse(loginCache));
        }
    }
    function fingerprint (e,d) {
        socket.removeListener("fingerprint",fingerprint);
        socket.sendMessage(e,_fingerprint);
    }

    $('#logolink').click(function () {
        location.reload(true);
    });

    function socket_duplicado (e) {
        nav.nav('506',null,null,'body');
        socket.removeListener(NetEvent.SOCKET_CLOSE,socket_CLOSE);
        socket.close();
    }
    function socket_closing (e) {
        nav.nav('601',null,null,'body');
        socket.removeListener(NetEvent.SOCKET_CLOSE,socket_CLOSE);
        socket.close();
    }
    function socket_OPEN(e) {
        $('#conectando').fadeOut();
    }
    function login (d,f) {
        d.fp = _urfinger;
        socket.sendMessage('login',d,f);
    }
    function socket_CLOSE(e) {
        $('#conectando').fadeIn();
        vendiendo=false;
        setTimeout(main_initSocket,3000);
    }
    function reload () {
        location.reload(false);
    }
    function socket_LOGIN(e,d) {
        if (d.hasOwnProperty("code")) {
            if (d.code==5) {
                nav.nav("507",null,null,"body");
                storage.removeItem("loto_taqlogin");
                socket.removeListener(NetEvent.SOCKET_CLOSE,socket_CLOSE);
                socket.close();
            }
            return;
        }
        $usuario = d.taq;
        $('.username').html($usuario.nombre);
        $elementos = d.elementos;
        $sorteos = d.sorteos;
        $numeros = d.numeros;

        $servidor.hora = d.time;

        nav.navUrl();
    }

    //herramienta conversion
    $('#cbsf').submit(function (e) {

        e.preventDefault(e);
        var data = formControls(this);
        var x = parseFloat(data.n)/100000;
        $('#cbsfr').html(x.format(2));
    });

    $('#cbss').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var x = parseFloat(data.n)*100000;
        $('#cbssr').html(x.format(0));
    });
//UI
//ANULAR

    $('#vnt-anular').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var f = formLock(this);
        setTimeout(function () {
            formLock(f,false);
        },2000);
        //actividad($actividad.ANULAR,data);
        socket.sendMessage("venta-anular",data, function (e, d) {
            //actividad($actividad.ANULAR,d);
            formReset(f);
            if (d.hasOwnProperty('code')) {
                if (d.code==2) notificacion("TICKET NO EXISTE");
                else if (d.code==4) notificacion("TICKET YA SE ENCUENTRA ANULADO");
                else if (d.code==5) notificacion("TICKET INVALIDO","TICKET CADUCADO");
            }
            else {
                $('#md-anularTicket').modal('hide');
                notificacion('TICKET ANULADO','TICKET #'+data.ticketID,'growl-success');
            }
        })
    });
    $('#md-anularTicket').on('shown.bs.modal', function (e) {
        var input = $('#md-anular-ticket');
        input.val('');
        input.focus()
    });
//PREMIAR
    var hlp = {
        formatDate:dateFormat,
        formatNumber:formatNumber,
        padding:padding
    };
    $('#vnt-pagar').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var f = formLock(this);
        var premios;
        socket.sendMessage("venta-premios",data, function (e, d) {
            formLock(f,false);
            if (d.hasOwnProperty("code")) {
                notificacion("TICKET NO EXISTE",'');
            } else {
                premios = d.prm;
                $('#md-pagar-tpremio').html(jsrender($('#rd-premio-ticket'), [d.tk]));
                $('#md-pagar-prms').html(jsrender($('#rd-premio-premios'), d.prm, hlp));
                $('.pagar-premio').click(function (e) {
                    var btn = $(e.target);
                    var venta = btn.data('id');
                    var ticket = btn.data('ticket');
                    var sorteo = btn.data('sorteoid');
                    var prm = findBy("ventaID",venta, d.prm).premio;
                    var codigo = parseInt($('#md-pagar-codigo').val());
                    btn.prop("disabled", true);
                    socket.sendMessage('venta-pagar', {id: venta, tk: ticket, cod:codigo, sorteoID:sorteo,premio:prm}, function (e, d) {
                        if (d.hasOwnProperty("code")) {
                            notificacion("#"+ticket+": PAGO NO PROCESADO","CODIGO INVALIDO o TICKET EXPIRO","growl-danger");
                            btn.prop("disabled", false);
                        } else btn.html('<i class="fa fa-check"></i>');
                    })
                });
                $('#anulado-timestamp').click(function (e) {
                    e.preventDefault(e);
                    var ticket = $(this).attr('ticketID');
                    socket.sendMessage('ticket-anulado',{ticketID:ticket}, function (e, d) {
                        if (d.hasOwnProperty("code")) notificacion('ERROR AL LEER HORA DE ANULACION');
                        else {
                            $('#anulado-labelstamp').html('SI <i class="fa fa-clock-o"></i> '+ d.tiempo);
                        }
                    })
                })
            }
        })
    });
    var mdTicket = $('#md-ticket');
    mdTicket.on('shown.bs.modal', function (e) {
        var input = $('#md-pagar-ticket');
        input.val('');
        input.focus();
    });
    mdTicket.on('hidden.bs.modal', function (e) {
        $('#md-pagar-ticket').val('');
        $('#md-pagar-codigo').val('0');
        $('#md-pagar-tpremio').html('');
        $('#md-pagar-prms').html('');
    });
//END UI
    nav.navUrl();
    $('.logout').click(function (e) {
        e.preventDefault(e);
        $usuario=null;
        $('.username').html('Usuario');
        localStorage.removeItem("loto_taqlogin");
        nav.nav('inicio');
    });
};
init();