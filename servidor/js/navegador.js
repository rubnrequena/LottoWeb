nav.paginas.addListener(Navegador.ENTER, function (p,a) {
    // Adjust mainpanel height
    var main = jQuery('.mainpanel');
    var docHeight = jQuery(document).height();
    var mh = main.height();
    if (docHeight > mh)
        main.height(docHeight);

    $('.date').datepicker({
        dateFormat:'yy-mm-dd'
    });

    $('.now').datepicker('setDate',new Date());

    $('.s2-elementos').html(jsrender($('#rd-elemento-option'),$elementos));
});
nav.paginas.addListener(Navegador.COMPLETE, function (p, a) {
    select2w($('.s2'),{allowClear:true,minimumResultsForSearch: 5});

    // Minimize Button in Panels
    jQuery('.panel-heading').click(function(){
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

    $('.toLower').change(function (e) {
        var a = $(e.target);
        a.val(a.val().toLowerCase());
    });
});

nav.paginas.addListener("login",login_nav);
function login_nav(p,arg) {
    $('#login-form').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        socket.sendMessage("login",data,function (e,d) {
            var recordar = $('#recordar').is(":checked");
            if (recordar) localStorage.setItem("srq_lot_srv_login",JSON.stringify(data));
        });
    });
}

nav.paginas.addListener("inicio",inicio_nav);
function inicio_nav(p,arg) {
    var hlp = copyTo(_helpers);
    hlp.ganador = function (n) {
        var e = findBy("elementoID",n,$elementos);
        return e? "#"+e.numero+' '+e.descripcion : '';
    };

    $('#btnload').click(function () {
        $("#inicio-sorteodia").html(jsrender($('#rd-pnlsorteo'),null));

        if ($elementos) {
            getReporte();
        } else {
            socket.sendMessage("elementos",null, function (e, d) {
                $elementos = d;
                getReporte();
            })
        }

        function getReporte () {
            socket.sendMessage("inicio", null, function (e,d) {
                if (d.hasOwnProperty("code")) {

                } else {
                    rdia = d.data;
                    var t1=0,t2=0,t3=0;
                    for (var i=0; i<rdia.length;i++) {
                        t1+=rdia[i].jugado;
                        t2+=rdia[i].premio;
                        t3+=rdia[i].pago;
                    };
                    $('#srt_dia').html(jsrender($('#rd-sorteos-dia-row'), d.data, hlp));
                }
                $('#str-dia-stamp').html(d.time);
            });
        }
    })
}

function sorteoMonitor_nav(e,arg) {
    var fecha = $('#sfecha');
    var d = new Date();
    var data; var dataForm;
    var mntfiltro; var filtrado;

    $('#ord-num-num').click(function (e) {
        e.preventDefault(e);
        $('.order-num').removeClass('btn btn-primary btn-sm');
        $(this).addClass('btn btn-primary btn-sm');
        data.n.sort(function (a,b) {
            return a.numero- b.numero;
        });
        $("#numeros-body").html(jsrender($('#rd-vtnum-row'), data.n));
        actualizarVista();
    });
    $('#ord-num-jg').click(function (e) {
        e.preventDefault(e);
        $('.order-num').removeClass('btn btn-primary btn-sm');
        $(this).addClass('btn btn-primary btn-sm');
        data.n.sort(function (a,b) {
            return b.jugada- a.jugada;
        });
        $("#numeros-body").html(jsrender($('#rd-vtnum-row'), data.n));
        actualizarVista();
    });
    fecha.on("change", function (e) {
        listarSorteos(e.target.value);
    });
    $('#monitor-form').submit(function (e) {
        e.preventDefault(e);
        var jg, tt;
        var help = _helpers;
        help.premio = function (m) {
            return (m*100/jg).format(2);
        };
        help.gana = function (m) {
            return (m*100/jg)>100;
        };
        help.pdist = function (n) {
            return (n*100/tt).format(2);
        };
        dataForm = formControls(this);
        var f = formLock(this);
        socket.sendMessage("monitor",dataForm, function (e, d) {
            formLock(f,false);
            data = d || [];
            var now = new Date();
            $("#ultact").html(now.format('dd/mm/yy hh:MM:ss TT'));

            jg=0; tt=0;
            var ld = d.t[0];
            d.t.forEach(function (item) {
                jg+=item.jugada;
                if (item.jugada>ld.jugada) ld = item;
            });

            $("#jugada").html(jg.format(2));
            $("#bnLider").html(ld.banca);
            $("#bnLider-jg").html(ld.jugada.format(2));

            ld = d.n[0];
            d.n.forEach(function (item) {
                tt+=item.tickets;
                item.pcj = item.jugada*100/jg;
                if (item.jugada>ld.jugada) ld = item;
            });
            $("#numLider").html(ld.desc);
            $("#numLider-jg").html(ld.jugada.format(2));

            $("#ventas-body").html(jsrender($('#rd-ventas-row'),d.t));
            $("#numeros-body").html(jsrender($('#rd-vtnum-row'),d.n,help));

            actualizarVista();
        })
    });

    $('#mnt-filtrar-tickets').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        filtrado = mntfiltro.filter(function (item) {
            return item.us==data.usuario||data.usuario==0;
        })
        filtrado = filtrado.filter(function (item) {
            return item.bc==data.banca||data.banca==0;
        })
        filtrado = filtrado.filter(function (item) {
            return item.tq==data.taquilla||data.taquilla==0;
        })
        $('#md-tickets-body').html(jsrender($('#rd-num-ticket'),filtrado))
        actualizarVista_tickets();
    });
    $('#mnt-ticket-smonto').click(function (e) {
        e.preventDefault(e);
        var ord = parseInt($(this).attr("ord"));
        $(this).attr("ord",ord*-1);
        if (filtrado) {
            filtrado.sort(ordenarMonto);
            $('#md-tickets-body').html(jsrender($('#rd-num-ticket'),filtrado))
        }
        else {
            mntfiltro.sort(ordenarMonto);
            $('#md-tickets-body').html(jsrender($('#rd-num-ticket'),mntfiltro));
        }
        actualizarVista_tickets();

        function ordenarMonto (a,b) {
            if (ord==1) {
                return a.m- b.m;
            } else {
                return b.m- a.m;
            }
        }
    });

    function actualizarVista() {
        $('.mnt-historial').click(function (e) {
            e.preventDefault(e);
            var num = $(this).attr("n");
            var help = {dateDif: function (d) {
                var _now = new Date().format().split("-");
                var now = new Date(_now[0],_now[1]-1,_now[2]);
                var da = d.split("-");
                var dd = new Date(da[0],da[1]-1,da[2]);
                return (now.getTime()-dd.getTime())/86400000;
            }};
            socket.sendMessage("sorteo-num-hist",{n:num}, function (e, result) {
                var ns = findBy("n",num, data.n);
                $('#md-hnum').html(ns.numero+" "+ns.desc);
                $('#md-historia-body').html(jsrender($('#rd-num-row'),result,help));
                $('#md-numhist').modal();
            });
        });
        $('.mnt-vnt-tickets').click(function (e) {
            e.preventDefault(e);
            var num = $(this).attr("n");
            socket.sendMessage("sorteo-monitor-vnt",{numero:num,sorteo:dataForm.sorteoID}, function (e, result) {
                mntfiltro = result;
                var us = uniqueVal(result,"us");
                var bn = uniqueVal(result,"bc");
                var tq = uniqueVal(result,"tq");

                us.unshift({us:0,usn:"TODAS"});
                bn.unshift({bc:0,bnc:"TODAS"});
                tq.unshift({tq:0,tqn:"TODAS"});

                var s2us = $('#mnt-ventas-us'), s2bc = $('#mnt-ventas-bc'), s2tq = $('#mnt-ventas-tq');
                s2us.html(jsrender($('#rd-us-option'),us));
                s2us.select2('val',0);
                s2bc.html(jsrender($('#rd-bn-option'),bn));
                s2bc.select2('val',0);
                s2tq.html(jsrender($('#rd-tq-option'),tq));
                s2tq.select2('val',0);

                $('#md-tickets-body').html(jsrender($('#rd-num-ticket'),result));
                actualizarVista_tickets();
                var ns = findBy("n",num, data.n);
                $('#md-tnum').html(ns.numero+" "+ns.desc);
                $('#md-numventas').modal();

                function uniqueVal (source,field,full) {
                    full = full==undefined?true:full;
                    var flags = [], output = [], l = source.length, i;
                    for( i=0; i<l; i++) {
                        if( flags[source[i][field]]) continue;
                        flags[source[i][field]] = true;
                        if (full) output.push(source[i]);
                        else output.push(source[i][field]);
                    }
                    return output;
                }
            });
        });

    }
    function actualizarVista_tickets () {
        $('.fticket').click(function (e) {
            e.preventDefault(e);
            var md = $('#md-ticket');
            var val = parseInt($(this).attr('tid'));
            md.on('shown.bs.modal', function (e) {
                md.off('shown.bs.modal',arguments.callee);
                var input = $('#md-pagar-ticket');
                input.val(parseInt(val));
                input.focus();
            });
            md.on('hidden.bs.modal', function (e) {
                md.off('hidden.bs.modal',arguments.callee);
                $('#md-numventas').modal("show");
            });
            $('#md-numventas').modal("hide");

            md.modal('show');
        });
    }
    function listarSorteos (fecha) {
        socket.sendMessage("sorteos",{lista:fecha}, function (e, d) {
            var sorteo = $('#ssorteos');
            sorteo.html(jsrender($('#rd-sorteo-option'),d));
            sorteo.select2("val", "");

            if (arg && arg.length>1) {
                var b = parseInt(arg[1]);
                sorteo.prop('selectedIndex',b).change();
                $('#monitor-form').submit();
            }
        })
    }

    if (arg && arg.length>0) {
        var a = arg[0].split("-");
        fecha.datepicker('setDate',new Date(a[0],parseInt(a[1])-1,a[2]));
        fecha.trigger('change');
    } else {
        listarSorteos(d.format());
    }
}
nav.paginas.addListener("sorteos/monitor",sorteoMonitor_nav);

function sorteoBuscar_nav(p,args) {
    var help = {
        padding:padding,
        sorteos: function (sorteo) {
            var s = "";
            var elem = exploreBy("sorteo",sorteo,$elementos);
            for (var i=0;i<elem.length;i++) {
                s += '<option value="'+elem[i].elementoID+'">#'+elem[i].numero+' '+elem[i].descripcion+'</option>';
            }
            return s;
        }
    };
    var srts = [];

    var toggles = $('.tgl');
    toggles.each(function (index) {
        var me = $(this);
        me.toggles({
            text:{
                on:"SI",
                off:"NO"
            },
            on:me.data('activo'),
            click:true
        });
    });
    toggles.on("toggle", function (e,act) {
        update_sorteosView();
    });

    $('#sorteo-buscar').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var f = formLock(this);
        socket.sendMessage("sorteos",data, function (e, d) {
            formLock(f,false);
            srts = d || [];
            update_sorteosView();
        })
    })
    function update_sorteosView() {
        var bsorteo = $('#buscar-sorteos');
        var s = uniqueVal(srts,"sorteo");
        var smin = [];
        s.forEach(function (item) {
            smin.push(findBy("sorteoID",item.sorteo,$sorteos));
        })
        bsorteo.html(jsrender($('#rd-operadora-option'),smin));
        bsorteo.select2('val',"");
        bsorteo.val("");
        bsorteo.select2("open");

        $('.bfiltro').change(function () {
            bsorteo.trigger("change");
        })

        bsorteo.change(function (ev) {
            var sorteo = ev.target.value;
            var sorteos = exploreBy("sorteo",sorteo,srts);
            //cargar elementos
            var elm = findBy("sorteo",sorteo,$elementos);
            if (elm) initUI();
            else {
                socket.sendMessage("elementos",{sorteo:sorteo}, function (e, d) {
                    $elementos = $elementos.concat(d);
                    initUI();
                })
            }

            function initUI() {
                //filtros
                var ab = $('#srt-abr').val();
                var prm = $('#srt-prm').val();
                var flt = $('#srt-flt').val();
            
                var fsorteos = sorteos.filter(function (item) {
                    var a,b;
                    if (flt==0) return true;
                    else {
                        if (ab==1) a = item.abierta==true;
                        else a = item.abierta == false;

                        if (prm==1) b = item.g?true:false;
                        else b = item.g==null;

                        return a&&b;
                    }
                })

                //init
                $('#sorteos-body').html(jsrender($('#rd-sorteo-row'),fsorteos,help));

                var toggles = $('.ttgl');
                toggles.each(function (index) {
                    var me = $(this);
                    me.toggles({
                        text:{
                            on:"SI",
                            off:"NO"
                        },
                        on:me.data('activa'),
                        click:true
                    });
                });
                toggles.on("toggle", function (e,act) {
                    var data = {
                        sorteo:$(e.target).data('target'),
                        abierta:act
                    };
                    socket.sendMessage("sorteo-editar",data, function (e, d) {
                        console.log(e,d);
                    })
                });

                select2w($('.s3'),{allowClear:true});
                $('select.sorteosel').each(function (idx,item) {
                    var s = $(item).data('select');
                    $(item).val(s);
                    $(item).select2('val',s);
                });
                $('.sorteosel').change(function (ev) {
                    var val = ev.target.value; var e = $(this); var sorteo = e.data('sorteo');
                    var el = findBy("elementoID",val,$elementos);
                    var sr = findBy("sorteoID",sorteo,srts);
                    var r = confirm('Confirma que desea registrar #'+sr.sorteoID+' '+sr.descripcion+' #'+el.numero+' '+el.descripcion);
                    if (r) {
                        var data = {
                            sorteoID: sorteo,
                            elemento: val
                        };
                        premiar(data,e);
                    } else {
                        e.select2('val',e.data('select'));
                        e.val(e.data('select'));
                    }
                });
            }
            function premiar (data,elm) {
                socket.sendMessage("sorteo-premiar", data, function (e, d) {
                    var el;
                    if (d.code==1) {
                        el = findBy("elementoID",data.elemento,$elementos);
                        notificacion('SORTEO PREMIADO', 'SORTEO #' + data.sorteoID + " PREMIADO<p>GANADOR: #" + el.numero +" "+ el.descripcion +"</p>");
                    } else if (d.code==0) {
                        el = findBy("elementoID",data.elemento,$elementos);
                        notificacion('[JV] SOLICITUD ACEPTADA', 'SORTEO #' + data.sorteoID + "<p>GANADOR: #" + el.numero +" "+ el.descripcion +"</p>");
                    }
                    else if (d.code==4) {
                        notificacion("SORTEOS","SORTEO #"+data.sorteoID+" YA ESTA PREMIADO",'growl-danger');
                        var r = confirm('Este sorteo ya esta premiado, desea reiniciarlo');
                        if (r) {
                            socket.sendMessage("sorteo-reiniciar", {sorteoID:data.sorteoID}, function (e, d) {
                                notificacion("SORTEOS", "SORTEO #" + data.sorteoID + " REINICIADO SATISFACTORIAMENTE");
                                if (confirm('DESEA VOLVER A PREMIAR CON EL NUMERO SELECCIONADO?')) premiar(data,elm);
                            });
                        } else {
                            elm.select2("val",elm.data('select'));
                            elm.select2("val",elm.data('select'));
                        }
                    }
                    else if (d.code==3) notificacion("SORTEOS","SORTEO #"+data.sorteoID+" PREMIADO, PERO SIN VENTAS REGISTRADAS",'growl-danger');
                    else if (d.code==5) notificacion("SOLICITUD RECHAZADA"," SORTEO #"+data.sorteoID+" SOLICITUD DUPLICADA",'growl-danger');
                });
            }
        });
    }
    function filtrar (item) {
        var a = $('#srt-abr').value;
        var p = $('#srt-prm').value;
        item.gid = item.gid||0;
        console.log(item.abierta,a,item.gid,p);
        if (item.abierta==a && item.gid==p) {

            return true;
        }
        else return false;
    }
}
nav.paginas.addListener("sorteos/buscar",sorteoBuscar_nav);

function sorteoNuevo_nav(p,arg) {
    var sorteos;
    var sorteo = $('#sorteos');
    getScript('../theme/js/bootstrap-timepicker.min.js', function () {
        $('.time').timepicker();
    });

    sorteo.change(function () {
        updSorteos();
    });


    socket.sendMessage("lsorteos",null,function (e,d) {
        sorteo.html(jsrender($('#rd-sorteo'),d));

        socket.sendMessage('presorteos',null, function (e, d) {
            sorteos = d || [];

            sorteo.select2("val", "");
            updSorteos();
        });
    });

    $('#presorteo-nuevo').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        delete data.hour;
        delete data.minute;
        delete data.meridian;
        socket.sendMessage("presorteo-nuevo",data, function (e, d) {
            data.sorteoID = d;
            sorteos.push(data);
            updSorteos();
        });
    });

    function updSorteos () {
        var id = parseInt(sorteo.val());
        console.log(id);
        var s = sorteos.filter(function (item) {
            return item.sorteo==id;
        });
        $('#presorteo-body').html(jsrender($('#rd-presorteo-row'),s));
        $('.sorteo-rem').click(function (e) {
            e.preventDefault(e);
            var id = parseInt($(this).attr('sorteo'));
            socket.sendMessage("presorteo-remover",{sorteoID:id}, function (e, d) {
                var index = findIndex("sorteoID",id,s);
                s.splice(index,1);
                $('#prs-'+id).remove();
            });
        });
    }
}
nav.paginas.addListener("sorteos/nuevo",sorteoNuevo_nav);

function sorteoRegistrar_nav(p,arg) {
    var desde = $('#desde'), hasta = $('#hasta');
    var ct;

    if ($sorteos && $sorteos.length>0) $('#sorteos').html(jsrender($('#rd-lsorteo-option'),$sorteos));
    else {
        socket.sendMessage("lsorteos",null,function (e,d) {
            $sorteos = d;
            $('#sorteos').html(jsrender($('#rd-lsorteo-option'),$sorteos));
        });
    }

    $('#sorteo-registrar').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var form = formLock(this);
        data.fecha = desde.val();

        var dt = desde.val().split('-');
        ct = new Date(dt[0],dt[1]-1,dt[2]);

        socket.addListener("sorteo-registrar",sorteo_registrar_handler);
        socket.sendMessage("sorteo-registrar",data);

        function sorteo_registrar_handler (e,d) {
            notificacion("SORTEO(S) REGISTRADO(S)", "<p>Fecha: "+ data.fecha+"</p><p>"+d.length + " sorteos registrados</p>");

            var h = hasta.val();
            if (data.fecha<h) {
                ct.setDate(ct.getDate()+1);
                data.fecha = ct.format('yyyy-mm-dd');
                setTimeout(function () {
                    socket.sendMessage("sorteo-registrar",data);
                },500);
            } else {
                socket.removeListener("sorteo-registrar",sorteo_registrar_handler);
                formLock(form,false);
            }
        }
    })
}
nav.paginas.addListener("sorteos/registrar",sorteoRegistrar_nav);

function sorteoFrutas_nav (p,arg) {
    var sorteo = $('#sorteos');
    if ($sorteos && sorteos.length>0) $('#sorteos').html(jsrender($('#rd-sorteo'),$sorteos));
    else {
        socket.sendMessage("lsorteos",null,function (e,d) {
            $sorteos = d;
            $('#sorteos').html(jsrender($('#rd-sorteo'),$sorteos));
            sorteo.select2("val","");
        });
    }
    sorteo.change(function () {
       elementos();
    });

    $('#elemento-form').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        socket.sendMessage("elemento-nuevo", data, function (e, d) {
            $('#descripcion').val('');
            var n = $('#numero'); n.val(''); n.focus();
            data.elementoID = d;
            $elementos.push(data);
            elementos();
        })
    });

    var id, el;
    function elementos() {
        id = sorteo.val();
        socket.sendMessage('elementos',{sorteo:id}, function (e, d) {
            el = d;
            $('#elementos-body').html(jsrender($('#elemento-row'),d));
        })
    }

    $('#fzodiaco').submit(function (e) {
        e.preventDefault(e);
        var d = formControls(this);
        var z = ["CP","AC","PI","AR","TA","GE","CN","LE","VI","LI","ES","SA"];
        var data = []; var l=100;
        for (var i=0;i<el.length;i++) {
            for (var j=0;j<z.length;j++) {
                data.push({
                    numero:el[i].numero+z[j],
                    descripcion:el[i].numero+"-"+j
                });
            }
        }
        socket.sendMessage("elemento-nuevo-zodiaco", {sorteo:id,numeros:data,adicional: d.adicional}, function (e, d) {
            notificacion('SORTEO ZODIACALIZADO');
        });
    })
}
nav.paginas.addListener("sorteos/frutas",sorteoFrutas_nav);

function sorteoPremiar_nav() {
    var sorteo = $('#premiar-sorteo'), numeros = $('#premiar-numero'), opt = $('#rd-sorteo-option'), rdElm = $('#rd-elemento-option');
    var sorteos;

    $('.date').on("change", function (e) {
        listarSorteos(e.target.value);
    });
    sorteo.on('change', function () {
       listarNumeros(sorteo.val());
    });
    $('#premiar-form').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var form = formLock(this);
        socket.sendMessage("sorteo-premiar", data, function (e, d) {
            formLock(form, false);
            var el;
            if (d.code==1) {
                el = findBy("elementoID",data.elemento,$elementos);
                notificacion('SORTEO PREMIADO', 'SORTEO #' + data.sorteoID + " PREMIADO<p>GANADOR: #" + el.numero +" "+ el.descripcion +"</p>");
            } else if (d.code==0) {
                el = findBy("elementoID",data.elemento,$elementos);
                notificacion('[JV] SOLICITUD ACEPTADA', 'SORTEO #' + data.sorteoID + "<p>GANADOR: #" + el.numero +" "+ el.descripcion +"</p>");
            }
            else if (d.code==4) notificacion("SORTEOS","SORTEO #"+data.sorteoID+" YA ESTA PREMIADO",'growl-danger');
            else if (d.code==3) notificacion("SORTEOS","SORTEO #"+data.sorteoID+" PREMIADO, PERO SIN VENTAS REGISTRADAS",'growl-danger');
            else if (d.code==5) notificacion("SOLICITUD RECHAZADA"," SORTEO #"+data.sorteoID+" SOLICITUD DUPLICADA",'growl-danger');
        })
    });
    $('#reiniciar-form').submit(function (e) {
        e.preventDefault(e);
        var c = confirm("Seguro desea reiniciar premio?");
        if (c) {
            var data = formControls(this);
            var f = formLock(this);
            socket.sendMessage("sorteo-reiniciar", data, function (e, d) {
                formLock(f, false);
                if (d.hasOwnProperty("code")) {
                    notificacion("SERVIDOR OCUPADO", "INTENTE NUEVAMENTE");
                } else {
                    notificacion("SORTEOS", "SORTEO #" + data.sorteoID + " REINICIADO SATISFACTORIAMENTE");
                }
            })
        }
    });

    function listarSorteos (fecha) {
        socket.sendMessage("sorteos",{lista:fecha}, function (e, d) {
            sorteos = d || [];
            var sorteo = $('#premiar-sorteo');
            sorteo.html(jsrender(opt,sorteos));
            sorteo.select2("val", "");

            sorteo = $('#reiniciar-sorteo');
            sorteo.html(jsrender(opt,sorteos));
            sorteo.select2("val", "");
        })
    }
    function listarNumeros (sorteo) {
        var srt = findBy("sorteoID",sorteo, sorteos);
        numeros.html(jsrender(rdElm,exploreBy('sorteo',srt.sorteo,$elementos)));
    }
    var d = new Date().format();
    listarSorteos(d);
}
nav.paginas.addListener("sorteos/premiar",sorteoPremiar_nav);

function bancasUsuarios_nav() {
    if ($usuarios) updateView();
    else socket.sendMessage('usuarios', null, function (e, d) {
        $usuarios = d || [];
        updateView();
    });
    function updateView() {
        $usuarios.sort(function (a,b) {
            if (b.activo-a.activo) {
                return 1;
            } else {
                return -1;
            }
        });

        $('#usuarios-body').html(jsrender($('#rd-usuario-row'), $usuarios));


        var cmbn = $('#us-cmbn');
        cmbn.on("change",function () {
            updateView();
        })
        if (cmbn.is(":checked")) {
            $('.us-bn').addClass("hidden");
            $('.us-cm').removeClass("hidden");
        } else {
            $('.us-bn').removeClass("hidden");
            $('.us-cm').addClass("hidden");
        }

        var clave = $('.clave');
        clave.on("mouseover",function () {
            var id = parseInt($(this).attr("uid"));
            $(this).html(findBy("usuarioID",id,$usuarios).clave);
        });
        clave.on("mouseout",function () {
            $(this).html("***")
        });

        var toggles = $('.toggle');
        toggles.each(function (index) {
            var me = $(this);
            me.toggles({
                text:{
                    on:"SI",
                    off:"NO"
                },
                on:me.data('activo'),
                click:true
            });
        });
        $('.btgl').on("toggle", function (e,act) {
            var id = $(e.target).data('target');
            var usuario = findBy("usuarioID",id,$usuarios);
            act = act==1?3:act; //full activo
            socket.sendMessage("usuario-editar",{usuarioID:usuario.usuarioID,activo:act}, function (e, d) {
                if (d.code==1) usuario.activo = act;
                else {
                    alert("ERROR AL ACTIVAR/DESACTIVAR USUARIO");
                }
            })
        });
    }

    $('#usuario-nuevo').submit(function (e) {
        e.preventDefault(e);
        var pswg = $('#psw-grupo'); pswg.removeClass("has-error");
        var data = formControls(this);
        data.comision = 0;
        data.participacion = 0;
        data.renta = 0;
        var form = formLock(this);
        socket.sendMessage("usuario-nuevo",data, function (e, d) {
            formReset(form);
            if (d>0) {
                data.usuarioID = d;
                $usuarios.push(data);
                updateView();
                notificacion('USUARIO NUEVO', "Usuario registrado exitosamente", 'growl-success');
            } else {
                notificacion("USUARIO DUPLICADO","Imposible registrar usuario, ya existe",'growl-danger');
            }
        });
    })
}
nav.paginas.addListener("bancas/usuarios",bancasUsuarios_nav);

function bancasUsuario_nav(p,args) {
    var usuario, bancas, taquillas;

    $('#usuario-editar').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        data.usuarioID = usuario.usuarioID;
        var f = formLock(this);
        socket.sendMessage("usuario-editar",data, function (e, d) {
            formLock(f,false);
            console.log(e,d);
        })
    });

    function updateBancas() {
        $('#bancas-body').html(jsrender($('#rd-banca-row'),bancas));

        var psw = $('.password');
        psw.on('mouseover', function (e) {
            $(e.target).html($(e.target).data('clave'));
        });
        psw.on('mouseout', function (e) {
            $(e.target).html("***");
        });
        var toggles = $('.toggle');
        toggles.each(function (index) {
            var me = $(this);
            me.toggles({
                text:{
                    on:"SI",
                    off:"NO"
                },
                on:me.data('activa'),
                click:true
            });
        });
        $('.btgl').on("toggle", function (e,act) {
            var id = $(e.target).data('target');
            var banca = findBy("bancaID",id,bancas);
            socket.sendMessage("banca-editar",{bancaID:banca.bancaID,activa:act}, function (e, d) {
                if (d==1) banca.activa = act;
                else {
                    alert("ERROR AL MODIFICAR ESTADO ACTIVO DE BANCA")
                }
            })
        });
    }

    if (args && args.length==1) {
        socket.sendMessage("usuarios",{id:args[0]}, function (e, d) {
            usuario = d[0];
            formSet($('#usuario-editar'),usuario);

            socket.sendMessage('bancas', {usuario:usuario.usuarioID}, function (e, d) {
                bancas = d || [];
                updateBancas();
            });
        });

        $('#banca-nueva').submit(function (e) {
            e.preventDefault(e);
            var data = formControls(this);
            data.usuarioID = usuario.usuarioID;
            data.renta = data.renta/100;
            var form = formLock(this);
            socket.sendMessage("banca-nueva",data, function (e, d) {
                formLock(form,false);
                if (d>0) {
                    formReset(form);
                    data.bancaID = d;
                    bancas.push(data);
                    updateBancas();
                    notificacion("BANCA NUEVA", "Banca registrada exitosamente");
                } else {
                    notificacion("ERROR", "Banca no registrada, usuario duplicado",'growl-danger');
                }
            })
        })

    } else {
        nav.nav("406");
    }
}
nav.paginas.addListener("bancas/usuario",bancasUsuario_nav);

function bancasSuspender_nav (p,args) {
    var ltSuspender = []
    var cm = $('#sup-comer'), cbody = $('#cond-body');
    var bn = $('#sup-banca');
    cm.change(function () {
        bn.html('')
        socket.sendMessage('usuarios', {comercial:cm.val()}, function (e, d) {
           bn.html(jsrender($('#rd-usuario-option'),d));
           bn.select2("val","")
        });
    })
    $('#suspnvo-form').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        if (data.hasOwnProperty("bID")) {
            data.sID = "u"+data.bID;
            delete data.bID;
        } else data.sID = "c"+data.sID;
        var form = formLock(this)
        socket.sendMessage("usuario-suspnvo",data, function (e, d) {
            formLock(form,false)
            cbody.html("");
            getLista();
        });
    });
    function getLista () {
        socket.sendMessage("usuario-listaSuspender", null, function (e, d) {
            ltSuspender = d;
            cbody.html(jsrender($('#rd-cond-row'), d));

            $('.sprem').click(function (e) {
                e.preventDefault(e);
                var id = $(this).attr("usID");
                var c = confirm("SEGURO DESEA REMOVER ESTA CONDICION?")
                if (c) {
                    socket.sendMessage("usuario-susprem", {usID: id}, function (e, d) {
                        var i = findBy("sID", id, ltSuspender)
                        $('#r' + id).remove();
                    });
                }
            })

            socket.sendMessage("comerciales", null, function (e, d) {
                cm.html(jsrender($('#rd-usuario-option'), d));
                cm.select2("val", "");
                bn.select2("val","");
            })
        })
    }; getLista();
}
nav.paginas.addListener("bancas/suspensiones",bancasSuspender_nav);

function bancasComercial_nav (p,args) {
    var usuario, bancas, taquillas,usuarios = $('#usuarios');

    $('#usuario-editar').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        data.usuarioID = usuario.usuarioID;
        data.renta = data.renta/100;
        data.participacion = data.participacion/100;
        data.comision = data.comision/100;
        if ($('#alquiler').is(':checked')) data.comision = data.comision*-1;
        var f = formLock(this);
        socket.sendMessage("usuario-editar",data, function (e, d) {
            formLock(f,false);
            var u = findBy("usuarioID",data.usuarioID,$usuarios);
            u.renta = data.renta;
            notificacion("EDICION EXITOSA");
        })
    });

    function updateBancas() {
        $('#bancas-body').html(jsrender($('#rd-banca-row'),bancas));

        var psw = $('.password');
        psw.on('mouseover', function (e) {
            $(e.target).html($(e.target).data('clave'));
        });
        psw.on('mouseout', function (e) {
            $(e.target).html("***");
        });
        var toggles = $('.toggle');
        toggles.each(function (index) {
            var me = $(this);
            me.toggles({
                text:{
                    on:"SI",
                    off:"NO"
                },
                on:me.data('activa'),
                click:true
            });
        });
        $('.btgl').on("toggle", function (e,act) {
            var id = $(e.target).data('target');
            var banca = findBy("usuarioID",id,bancas);
            act = act==1?3:act;
            socket.sendMessage("usuario-editar",{usuarioID:banca.usuarioID,activo:act}, function (e, d) {
                if (d.code==1) {
                    notificacion('ACT/DESC COMPLETADA CON EXITO');
                    banca.activo = act;
                } else {
                    alert("ERROR AL MODIFICAR ESTADO ACTIVO DE BANCA")
                }
            })
        });
    }

    if (args && args.length==1) {
        socket.sendMessage("usuarios",{id:args[0]}, function (e, d) {
            usuario = d[0];
            formSet($('#usuario-editar'),usuario,function (val,field) {
                if (field=="comision" || field=="participacion" || field=="renta") return Math.abs(val*100);
                if (val===false) return 0;
                else if (val===true) return 1;
                else return val;
            });
            if (usuario.comision<0) $('#alquiler').prop("checked",1);

            socket.sendMessage('usuarios', {comercial:usuario.usuarioID}, function (e, d) {
                bancas = d || [];
                updateBancas();

                if ($usuarios) updateView();
                else socket.sendMessage('usuarios', null, function (e, d) { $usuarios = d || []; updateView(); });
            });
        });

        $('#banca-nueva').submit(function (e) {
            e.preventDefault(e);
            var data = formControls(this);
            data.comision = data.comision / 100;
            data.participacion = data.participacion / 100;
            data.tipo = 1;
            data.renta = 0;
            data.cid = usuario.usuarioID;
            var form = formLock(this);
            socket.sendMessage("usuario-nuevo",data, function (e, d) {
                if (d>0) {
                    formReset(form);
                    data.usuarioID = d;
                    bancas.push(data);
                    updateBancas();
                    notificacion("BANCA NUEVA", "Banca registrada exitosamente");
                } else {
                    formLock(form,false);
                    notificacion("ERROR", "Banca no registrada, usuario duplicado",'growl-danger');
                }
            })
        });
        $('#banca-asignar').submit(function (e) {
            e.preventDefault(e);
            var data = formControls(this);
            data.cid = usuario.usuarioID;
            var f = formLock(this);
            socket.sendMessage("usuario-asignar",data, function (e, d) {
                formLock(f,false);
                if (d>0) {
                    notificacion('ASIGNACION EXITOSA');
                    socket.sendMessage('usuarios', {comercial:usuario.usuarioID}, function (e, d) {
                        bancas = d || [];
                        updateBancas();
                    });
                }
                else notificacion('ASIGNACION FALLIDA');
            })
        });
        function updateView() {
            var uactivo = $usuarios.filter(function (us) {
                return us.activo>0;
            });
            uactivo = uactivo.sort(function (a,b) {
                return a.nombre< b.nombre?-1:1;
            });
            usuarios.html(jsrender($('#rd-usuario-option'),uactivo));
            usuarios.select2("val",0);
        }
    } else {
        nav.nav("406");
    }
}
nav.paginas.addListener("bancas/comercial",bancasComercial_nav);

function bancasBanca_nav(p,args) {
    if (args && args.length==1) {
        var editar = $('#banca-nueva');
        var clave = $('#banca-psw');
        var renta = $('#banca-renta');
        var banca, grupos;

        var papelera = $('#papelera');
        papelera.change(function () {
            updateGrupos();
        });

        editar.submit(function (e) {
            e.preventDefault(e);
            var data = formControls(this);
            data.usuarioID = banca.usuarioID;
            data.renta = data.renta/100;
            data.comision = data.comision/100;
            data.participacion = data.participacion/100;
            formLock(this);
            socket.sendMessage("usuario-editar",data, function (e, d) {
                formLock(editar[0],false);
                if (d.code==1) {
                    notificacion("Cambios guardados con exito");
                    if (d.hasOwnProperty("activa")) banca.activa = d.activa;
                    if (d.hasOwnProperty("nombre")) banca.nombre = d.nombre;
                    if (d.hasOwnProperty("comision")) banca.comision = d.comision;
                    if (d.hasOwnProperty("usuario")) banca.usuario = d.usuario;
                }
                else notificacion('Error al realizar cambios','','growl-danger');
            });
        });
        /*renta.submit(function (e) {
            e.preventDefault(e);
            var data = formControls(this);
            data.bancaID = banca.bancaID;
            data.renta = data.renta/100;
            formLock(this);
            socket.sendMessage("banca-editar",data, function (e, d) {
                formLock(renta[0],false);
                if (d==1) notificacion("Cambios guardados con exito");
                else notificacion('Error al realizar cambios','','growl-danger');
            });
        });*/
        clave.submit(function (e) {
            e.preventDefault(e);
            formLock(this);
            var data = formControls(this);
            data.bancaID = banca.bancaID;
            socket.sendMessage("banca-editar",data, function (e, d) {
                formReset(clave[0]);
                if (d.code==1) {
                    notificacion("Cambio de clave exitoso");
                    if (d.hasOwnProperty("clave")) banca.clave = d.clave;
                }
                else notificacion('Cambio de clave fallido','','growl-danger');
            });
        });
        $('.rdo-com').change(function () {
            multiplo = this.value;
            $('#gr-comision').prop("disabled",this.value==0);
        });

        socket.sendMessage("usuarios",{id:args[0]}, function (e,d) {
            banca = d[0] || null;
            formSet(editar,banca,function (val,field) {
                if (field=="comision" || field=="participacion" || field=="renta") return Math.abs(val*100);
                if (val===false) return 0;
                else if (val===true) return 1;
                else return val;
            });

            socket.sendMessage("bancas",{usuario:banca.usuarioID}, function (e, d) {
                grupos = d || [];
                updateGrupos();
            });
        });

        function updateGrupos() {
            var _papelera = papelera.prop("checked");
            grupos.sort(function (a,b) {
                if (a.papelera< b.papelera) return -1;
                else if (a.papelera> b.papelera) return 1;
                else {
                    if (a.activa< b.activa) {
                        return 1;
                    } else if (a.activa> b.activa) {
                        return -1;
                    } else return a.taquillaID- b.taquillaID;
                }
            });

            $('#grupos-body').html(jsrender($('#rd-grupo-row'),grupos.filter(function (a) {
                return _papelera== a.papelera;
            })));

            var psw = $('.password');
            psw.on('mouseover', function (e) {
                $(e.target).html($(e.target).data('clave'));
            });
            psw.on('mouseout', function (e) {
                $(e.target).html("***");
            });

            var toggles = $('.toggle');
            toggles.each(function (index) {
                var me = $(this);
                me.toggles({
                    text:{
                        on:"SI",
                        off:"NO"
                    },
                    on:me.data('activa'),
                    click:true
                });
            });
            $('.btgl').on("toggle", function (e,act) {
                var id = $(e.target).data('target');
                var banca = findBy("bancaID",id,grupos);
                socket.sendMessage("banca-editar",{bancaID:banca.bancaID,activa:act}, function (e, d) {
                    if (d==1) notificacion("CAMBIO ACTIVO EXITOSO");
                    else {
                        alert("ERROR AL MODIFICAR ESTADO ACTIVO DE BANCA")
                    }
                })
            });

            $('.bn-remove-req').click(function (e) {
                e.preventDefault(e);
                var bID = $(this).attr("bancaID");
                var r = confirm('Seguro desea eliminar esta banca? Tenga en cuenta que enviara a la papelera todas las taquillas asociadas.');
                if (r===true) {
                    socket.sendMessage("banca-remover",{bancaID:bID,papelera:1}, function (e, d) {
                        if (d.code==1) {
                            var b = findBy("bancaID",bID,grupos);
                            b.papelera = 1;
                            updateGrupos();
                        }
                    })
                }
                return false;
            });
            $('.bn-remove-res').click(function (e) {
                e.preventDefault(e);
                var bID = $(this).attr("bancaID");
                var r = confirm('Seguro desea restaurar esta banca?  Tenga en cuenta que restaurara todas las taquillas asociadas.');
                if (r===true) {
                    socket.sendMessage("banca-remover",{bancaID:bID,papelera:0}, function (e, d) {
                        if (d.code==1) {
                            var b = findBy("bancaID",bID,grupos);
                            b.papelera = 0;
                            updateGrupos();
                        }
                    })
                }
                return false;
            });
        }
    } else {
        nav.nav("406");
    }
}
nav.paginas.addListener("bancas/banca",bancasBanca_nav);

function bancasTaquillas_nav(p,args) {
    if (args && args.length==1) {
        var editar = $('#banca-nueva');
        var clave = $('#banca-psw');
        var renta = $('#banca-renta');
        var banca, taquillas;
        var multiplo=0;

        var papelera = $('#papelera');
        papelera.change(function () {
            updateTaquillas();
        });

        editar.submit(function (e) {
            e.preventDefault(e);
            var data = formControls(this);
            data.bancaID = banca.bancaID;
            data.comision = data.comision*multiplo;
            //if (data.comision<$usuario.renta) { notificacion("ERROR","LA COMISION DE ALQUILER NO PUEDE SER MENOR A LA ASIGNADA POR EL ADMINISTRADOR"); return; }
            formLock(this);
            socket.sendMessage("banca-editar",data, function (e, d) {
                formLock(editar[0],false);
                if (d.code==1) {
                    notificacion("Cambios guardados con exito");
                    if (d.hasOwnProperty("activa")) banca.activa = d.activa;
                    if (d.hasOwnProperty("nombre")) banca.nombre = d.nombre;
                    if (d.hasOwnProperty("comision")) banca.comision = d.comision;
                    if (d.hasOwnProperty("usuario")) banca.usuario = d.usuario;
                }
                else notificacion('Error al realizar cambios','','growl-danger');
            });
        });
        renta.submit(function (e) {
            e.preventDefault(e);
            var data = formControls(this);
            data.bancaID = banca.bancaID;
            data.renta = data.renta/100;
            formLock(this);
            socket.sendMessage("banca-editar",data, function (e, d) {
                formLock(renta[0],false);
                if (d==1) notificacion("Cambios guardados con exito");
                else notificacion('Error al realizar cambios','','growl-danger');
            });
        });
        clave.submit(function (e) {
            e.preventDefault(e);
            formLock(this);
            var data = formControls(this);
            data.bancaID = banca.bancaID;
            socket.sendMessage("banca-editar",data, function (e, d) {
                formReset(clave[0]);
                if (d.code==1) {
                    notificacion("Cambio de clave exitoso");
                    if (d.hasOwnProperty("clave")) banca.clave = d.clave;
                }
                else notificacion('Cambio de clave fallido','','growl-danger');
            });
        });
        $('.rdo-com').change(function () {
            multiplo = this.value;
            $('#bn-comision').prop("disabled",this.value==0);
        });

        banca = findBy("bancaID",args[0],$bancas);
        if (!banca) {
            socket.sendMessage('bancas',{id:args[0]}, function (e, d) {
                $bancas.push(d[0]);
                banca = d[0];
                bancaResult();
            });
        } else bancaResult();


        function bancaResult() {

            formSet(editar,banca,function (val,field) {
                if (field=="comision") return Math.abs(val*100);
                if (val===false) return 0;
                else if (val===true) return 1;
                else return val;
            });
            if (banca.comision==0) $('#radioNormal').prop('checked',true);
            else if (banca.comision>0) $('#radioRecogedor').trigger('click');
            else if (banca.comision<0) $('#radioReventa').trigger('click');

            $('#taquilla-nueva').submit(function (e) {
                e.preventDefault(e);
                var data = formControls(this);
                data.bancaID = banca.bancaID;
                data.usuarioID = banca.usuarioID;
                var form = formLock(this);
                socket.sendMessage("taquilla-nueva", data, function (e, d) {
                    if (d.hasOwnProperty("code")) {
                        formLock(form,false);
                        notificacion("DISCULPE: USUARIO NO DISPONIBLE","El usuario que esta asignando a la taquilla, ya esta en uso intente con uno distinto.","growl-danger");
                    } else {
                        formReset(form);
                        data.taquillaID = d;
                        data.papelera = 0;
                        data.fingerlock = true;
                        data.fingerprint = null;
                        taquillas.push(data);
                        updateTaquillas();
                        notificacion('TAQUILLA REGISTRADA CON EXITO');
                    }
                });
            });

            socket.sendMessage("taquillas",{banca:banca.bancaID}, function (e, d) {
                taquillas = d || [];
                updateTaquillas();
            });

            function updateTaquillas() {
                var _papelera = papelera.prop("checked");
                taquillas.sort(function (a,b) {
                    if (a.papelera< b.papelera) return -1;
                    else if (a.papelera> b.papelera) return 1;
                    else {
                        if (a.activa< b.activa) {
                            return 1;
                        } else if (a.activa> b.activa) {
                            return -1;
                        } else return a.taquillaID- b.taquillaID;
                    }
                });

                $('#taquillas-body').html(jsrender($('#rd-taquilla-row'),taquillas.filter(function (a) {
                    return _papelera== a.papelera;
                })));
                var psw = $('.password');
                psw.on('mouseover', function (e) {
                    $(e.target).html($(e.target).data('clave'));
                });
                psw.on('mouseout', function (e) {
                    $(e.target).html("***");
                });

                var toggles = $('.activart');
                toggles.each(function (index) {
                    var me = $(this);
                    me.toggles({
                        text: {
                            on: "SI",
                            off: "NO"
                        },
                        on: me.data('activa'),
                        click: 1
                    });
                });
                toggles.on("toggle", function (e, act) {
                    var id = $(e.target).data('target');
                    var taquilla = findBy("taquillaID", id, taquillas);
                    socket.sendMessage("taquilla-editar", {taquillaID: taquilla.taquillaID, activa: act}, function (e, d) {
                        if (d===1) taquilla.activa = act;
                        else {
                            alert("ERROR AL MODIFICAR ESTADO ACTIVO DE TAQUILLA")
                        }
                    })
                });
                //fingerlock
                var fingerlock = $('.fingerlock');
                fingerlock.each(function (index) {
                    var me = $(this);
                    me.toggles({
                        text: {
                            on: "SI",
                            off: "NO"
                        },
                        on: me.data('activa'),
                        click: true
                    });
                });
                fingerlock.on("toggle", function (e, act) {
                    var id = $(e.target).data('target');
                    var taquilla = findBy("taquillaID", id, taquillas);
                    socket.sendMessage("taquilla-flock", {taquillaID: taquilla.taquillaID, activa: act}, function (e, d) {
                        if (d.ok===1) {
                            taquilla.fingerlock = act;
                            if (act==false) {
                                alert('ADVERTENCIA: Al desactivar el sistema de proteccion por huella, SRQ no podra, ni se hara responsable por posibles fraudes por ventas no autorizadas por parte de la agencia.');
                            }
                        }
                        else {
                            alert("ERROR AL MODIFICAR VALIDACION DE HUELLA")
                        }
                    })
                });

                //fingerclear
                $('.fingerclear').click(function (e) {
                    e.preventDefault(e);
                    var b = $(e.currentTarget);
                    var id = parseInt(b.attr('val'));
                    socket.sendMessage("taquilla-fpclear", {taquillaID:id}, function (e, d) {
                        if (d.ok===1) {
                            b.parent().html('<i class="fa fa-shield"></i>');
                        } else {
                            alert("ERROR AL MODIFICAR HUELLA DEL TAQUILLA")
                        }
                    })
                });

                $('.bn-remove-req').click(function (e) {
                    e.preventDefault(e);
                    var tID = $(this).attr("taqID");
                    var r = confirm('Seguro desea eliminar esta taquilla?');
                    if (r===true) {
                        socket.sendMessage("taquilla-remover",{taquillaID:tID,papelera:1}, function (e, d) {
                            if (d.code==1) {
                                var taquilla = findBy("taquillaID", tID, taquillas);
                                taquilla.papelera = 1;
                                updateTaquillas();
                            }
                        })
                    }
                    return false;
                });
                $('.bn-remove-res').click(function (e) {
                    e.preventDefault(e);
                    var tID = $(this).attr("taqID");
                    socket.sendMessage("taquilla-remover",{taquillaID:tID,papelera:0}, function (e, d) {
                        if (d.code==1) {
                            var taquilla = findBy("taquillaID", tID, taquillas);
                            taquilla.papelera = 0;
                            updateTaquillas();
                        }
                    });
                    return false;
                });
            }
            var remTaqI = $('#rem-taqinactivas');
            remTaqI.click(function () {
                var i=0;
                var taqs = taquillas.exploreBy("activa",0).exploreBy("papelera",0);
                if (taqs.length==0) return;
                remTaqI.prop('disabled',1);
                var taq, cont = $('#rem-tqinc');

                var r = confirm('Confirma desea remover todas las taquillas inactivas?');
                if (r===true) removerTaquilla(taqs[i].taquillaID);

                function removerTaquilla (id) {
                    cont.html(i+'/'+taqs.length);
                    socket.sendMessage('taquilla-remover',{taquillaID:id,papelera:1}, function (e,d) {
                        if (d.code==1) {
                            taq = findBy("taquillaID", id, taquillas);
                            taq.papelera = 1;
                            if (++i<taqs.length) removerTaquilla(taqs[i].taquillaID);
                            else {
                                updateTaquillas();
                                cont.html('');
                                remTaqI.prop('disabled',0);
                            }
                        }
                    });
                }
            });
        }
    } else {
        nav.nav("406");
    }
}
nav.paginas.addListener("bancas/taquillas",bancasTaquillas_nav);

function bancasTaquilla_nav(p,args) {
    if (args && args.length==1) {
        var taquilla;
        socket.sendMessage("taquillas",{id:args[0]}, function (e, d) {
            taquilla = d[0];
            formSet($('#taquilla-nueva'),taquilla);
        });

        $('#taquilla-nueva').submit(function (e) {
            e.preventDefault(e);
            var data = formControls(this);
            data.taquillaID = taquilla.taquillaID;
            var f = formLock(this);
            socket.sendMessage("taquilla-editar",data, function (e, d) {
                formLock(f,false);
                if (d.hasOwnProperty("code")) {
                    notificacion("DISCULPE: USUARIO NO DISPONIBLE","","growl-danger");
                } else notificacion('TAQUILLA','CAMBIOS REALIZADOS EXITOSAMENTE','growl-success');
            });
        });
        $('#cambiar-clave').submit(function (e) {
            e.preventDefault(e);
            var data = formControls(this);
            data.taquillaID = taquilla.taquillaID;
            var f = formLock(this);
            socket.sendMessage('taquilla-editar',data, function (e, d) {
                formReset(f);

            })
        });
    } else nav.nav("406");
}
nav.paginas.addListener("bancas/taquilla",bancasTaquilla_nav);

function bancasTopes_nav (p,args) {
    var help = {
        elm: function (n) {
            if (n==0) return "TODAS";
            else {
                var e = findBy("elementoID", n, $elementos);
                return e? e.descripcion:"";
            }
        },
        srt: function (id) {
            if (id==0) return "TODOS";
            else return '<a href="#sorteo|'+id+'">#'+padding(id,5)+'</a>';
        }
    };
    var data;

    var taqs = $('#taquilla');
    var s2bancas = $('.s2banca');

    data = $bancas.slice();
    data.unshift({bancaID:0,nombre:"TODAS"});
    s2bancas.html(jsrender($('#rd-banca-option'),data));

    data = $elementos.slice();
    data.unshift({elementoID:0,descripcion:'TODAS'});
    $('#elemento').html(jsrender($('#rd-elemento-option'),data));

    var banca = $('#banca');
    banca.change(function () {
        var b = $(this).val();
        socket.sendMessage("taquillas",{banca:b}, function (e, d) {
            d = d || [];
            d.unshift({taquillaID:0,nombre:"TODAS"});

            taqs.html(jsrender($('#rd-taquilla-option'),d));
            taqs.select2('val',0);
        })
    });
    banca.trigger('change');

    $('#topes-form').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var f = formLock(this);
        socket.sendMessage("topes",data, function (e, d) {
            formLock(f,false);
            $('#topes-body').html(jsrender($('#rd-topes-row'),d||[],help));
        })
    });

    $('#tope-nuevo').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        console.log(data);
        var f = formLock(this);
        socket.sendMessage("tope-nuevo",data, function (e,d) {
            formLock(f,false);
            console.log(e,d);
        })
    })
}
nav.paginas.addListener("bancas/topes",bancasTopes_nav);

function reporteGeneral_nav (p,args) {
	var f1 = $('#reporte-fecha1');
	var f2 = $('#reporte-fecha2');
    var reporte = $('#reporte');
    var rdata;
    _helpers.rgFiltro = function () {
        return (f1.val() && f2.val())?"|"+f1.val()+"|"+f2.val():'';
    };
    reporte.submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var f = formLock(this);
        var grp = $('#rp-agrupar').val();
        socket.sendMessage("reporte-general",{s:data,g:grp}, function (e, d) {
            formLock(f,false);
            if (!d) {
                $('#reporte-body').html('');
                $('.clr').html('--');
                return;
            }
            rdata = d;
            var j=0, pr=0, cm= 0, pt=0;
            d.forEach(function (item) {
                item.balance = item.jugada-item.premio;
                j+=item.jugada;
                pr+=item.premio;
				cm+= item.renta;
                pt+= item.balance*item.participacion;
            });

            $('#mnt-jugado').html(j.format(2));
            $('#mnt-premios').html(pr.format(2));

            var rank, bnc;
            //top jugado
            rank = d.slice();
            rank.sort(function (a, b) {
                return b.renta- a.renta;
            });
            bnc = rank[0];
            $('#tj-banca').html(bnc.desc);
            $('#tj-jugada').html(bnc.jugada.format(2));

            //top ganancia
            
            $('#renta').html(cm.format(2));

            $('#reporte-body').html(jsrender($('#rd-reporte'),d));
        })
    });

    $('#rtp-desc-o').click(function (e) {
        e.preventDefault(e);
        rdata.sort(function (a,b) {
            var ret = 0;
            a = a.desc.toLowerCase();
            b = b.desc.toLowerCase();
            if(a > b)
                ret = 1;
            if(a < b)
                ret = -1;
            return ret;
        });
        $('#reporte-body').html(jsrender($('#rd-reporte'),rdata));
    });

	if (args && args.length>0) {
		var a = args[0].split("-");
		var b = args[1].split("-");
        f1.datepicker('setDate',new Date(a[0],parseInt(a[1])-1,a[2]));
		f2.datepicker('setDate',new Date(b[0],parseInt(b[1])-1,b[2]));
        reporte.trigger("submit");
	}
}
nav.paginas.addListener("reporte/general",reporteGeneral_nav);

function reporteComercial_nav (p,args) {
    var comercial=args[0];
    var f1 = $('#reporte-fecha1');
    var f2 = $('#reporte-fecha2');
    var fdata;
    var reporte = $('#reporte');
    var premios = $('#prm-select'), grp = $('#rp-agrupar');
    var rpt; var hlp = {bn:function () { return $usuario.nombre;  }};
    $('#reporte').submit(function (e) {
        e.preventDefault(e);
        fdata = formControls(this);
        var f = formLock(this);
        $('#pheader').html(jsrender($('#rd-prtaq'),fdata,hlp));
        fdata.comercial = comercial;
        socket.sendMessage("reporte-comercial",{s:fdata,g:grp.val()}, function (e, d) {
            formLock(f,false);
            rpt = d || [];
            updateView();
        })
    });
    premios.change(updateView);

    function updateView () {
        if (rpt.length==0) return;
        var j=0, pr=0, pg=0, cm=0, rn= 0, b=0;
        rpt.forEach(function (item) {
            item.balance = item.jg - item.pr - item.cm - item.prt;
            item.rango = f1[0].value+'|'+f2[0].value;
            b+=item.balance;
            j+=item.jg;
            pr+= item.pr;
            cm+= item.cm;
            rn+= item.rt;
        });

        var total = {
            j: j.format(2), pr: pr.format(2), b:(b-rn).format(2),cm:cm.format(2), r:rn.format(2)
        };
        $('#bheader').html(jsrender($('#rd-total'),total));

        $('#mnt-jugado').html(j.format(2));
        $('#mnt-premios').html(pr.format(2));
        $('#mnt-pagos').html(pg.format(2));
        $('#mnt-balance').html((b-rn).format(2));

        $('#tg-descuento').html((cm+rn).format(2));
        $('#tg-comision').html(cm.format(2));
        $('#tg-renta').html(rn.format(2));

        var rank, bnc;
        //top jugado
        rank = rpt.slice();
        rank.sort(function (a, b) {
            return b.jg- a.jg;
        });
        bnc = rank[0];
        $('#tj-banca').html(bnc.desc);
        $('#tj-jugada').html(bnc.jg.format(2));
        $('#tj-balance').html(bnc.balance.format(2));

        //top ganancia
        rank = rpt.slice();
        rank.sort(function (a, b) {
            return b.balance- a.balance;
        });
        bnc = rank[0];
        $('#tg-banca').html(bnc.desc);
        $('#tg-jugada').html(bnc.jg.format(2));
        $('#tg-balance').html(bnc.balance.format(2));

        $('#reporte-body').html(jsrender($('#rd-reporte'),rpt));

        prepareDownload();
    }

    var formato = $('#formato');
    formato.change(prepareDownload);
    function prepareDownload() {
        var a = document.getElementById("exportar");
        a.href = "#reporte/general";
        var name = name = "SRQ - REPORTE "+fdata.inicio+"-"+fdata.fin+"."+formato.val();
        if (formato.val()=="json") {
            download("exportar",JSON.stringify(rpt,null,2),name,"text/plain");
        } else if (formato.val()=="csv") {
            notificacion("FORMATO NO DISPONIBLE");
        } else {
            html2canvas($("#print-img"), {
                onrendered: function (canvas) {
                    var myImage = canvas.toDataURL("image/png");
                    a.href = myImage;
                    a.download = name;
                }
            });
        }
    }

    if (args && args.length>1) {
        var a = args[1].split("-");
        var b = args[2].split("-");
        f1.datepicker('setDate',new Date(a[0],parseInt(a[1])-1,a[2]));
        f2.datepicker('setDate',new Date(b[0],parseInt(b[1])-1,b[2]));
        reporte.trigger("submit");
    }
}
nav.paginas.addListener("reporte/comercial",reporteComercial_nav);

function reporteBanca_nav (p,args) {
    var f1 = $('#reporte-fecha1');
    var f2 = $('#reporte-fecha2');
    var fdata;
    var reporte = $('#reporte');
    var premios = $('#prm-select'), grp = $('#rp-agrupar');
    var rpt; var hlp = {bn:function () { return $usuario.nombre;  }};
    $('#reporte').submit(function (e) {
        e.preventDefault(e);
        fdata = formControls(this);
        fdata.usuarioID = args[0];
        var f = formLock(this);
        $('#pheader').html(jsrender($('#rd-prtaq'),fdata,hlp));
        socket.sendMessage("reporte-banca",{s:fdata,g:grp.val()}, function (e, d) {
            formLock(f,false);
            rpt = d || [];
            updateView();
        })
    });
    premios.change(updateView);

    function updateView () {
        if (rpt.length==0) return;
        var j=0, pr=0, pg=0, cm=0, rn= 0, b=0;
        rpt.forEach(function (item) {
            item.balance = item.jg - item.pr - (item.cm || item.cmt) - item.prt;
            item.rango = f1[0].value+'|'+f2[0].value;
            b+=item.balance;
            j+=item.jg;
            pr+= item.pr;
            cm+= item.cm || item.cmt;
            rn+= item.rt;
        });

        var total = {
            j: j.format(2), pr: pr.format(2), b:(b-rn).format(2),cm:cm.format(2), r:rn.format(2)
        };
        $('#bheader').html(jsrender($('#rd-total'),total));

        $('#mnt-jugado').html(j.format(2));
        $('#mnt-premios').html(pr.format(2));
        $('#mnt-pagos').html(pg.format(2));
        $('#mnt-balance').html((b-rn).format(2));

        $('#tg-descuento').html((cm+rn).format(2));
        $('#tg-comision').html(cm.format(2));
        $('#tg-renta').html(rn.format(2));

        var rank, bnc;
        //top jugado
        rank = rpt.slice();
        rank.sort(function (a, b) {
            return b.jg- a.jg;
        });
        bnc = rank[0];
        $('#tj-banca').html(bnc.desc);
        $('#tj-jugada').html(bnc.jg.format(2));
        $('#tj-balance').html(bnc.balance.format(2));

        //top ganancia
        rank = rpt.slice();
        rank.sort(function (a, b) {
            return b.balance- a.balance;
        });
        bnc = rank[0];
        $('#tg-banca').html(bnc.desc);
        $('#tg-jugada').html(bnc.jg.format(2));
        $('#tg-balance').html(bnc.balance.format(2));

        $('#reporte-body').html(jsrender($('#rd-reporte'),rpt));

        prepareDownload();
    }

    var formato = $('#formato');
    formato.change(prepareDownload);
    function prepareDownload() {
        var a = document.getElementById("exportar");
        a.href = "#reporte/general";
        var name = name = "SRQ - REPORTE "+fdata.inicio+"-"+fdata.fin+"."+formato.val();
        if (formato.val()=="json") {
            download("exportar",JSON.stringify(rpt,null,2),name,"text/plain");
        } else if (formato.val()=="csv") {
            notificacion("FORMATO NO DISPONIBLE");
        } else {
            html2canvas($("#print-img"), {
                onrendered: function (canvas) {
                    var myImage = canvas.toDataURL("image/png");
                    a.href = myImage;
                    a.download = name;
                }
            });
        }
    }

    if (args && args.length>1) {
        a = args[1].split("-");
        b = args[2].split("-");
        f1.datepicker('setDate',new Date(a[0],parseInt(a[1])-1,a[2]));
        f2.datepicker('setDate',new Date(b[0],parseInt(b[1])-1,b[2]));
        reporte.trigger("submit");
    }
}
nav.paginas.addListener("reporte/banca",reporteBanca_nav);

function reporteRecogedor_nav (p,args) {
    var f1 = $('#reporte-fecha1');
    var f2 = $('#reporte-fecha2');
    var fdata;
    var reporte = $('#reporte');
    var premios = $('#prm-select'), grp = $('#rp-agrupar');
    var rpt; var hlp = {bn:function () { return $usuario.nombre;  }};
    $('#reporte').submit(function (e) {
        e.preventDefault(e);
        fdata = formControls(this);
        fdata.bancaID = args[0];
        var f = formLock(this);
        $('#pheader').html(jsrender($('#rd-prtaq'),fdata,hlp));
        socket.sendMessage("reporte-recogedor",{s:fdata,g:grp.val()}, function (e, d) {
            formLock(f,false);
            rpt = d || [];
            updateView();
        })
    });
    premios.change(updateView);

    function updateView () {
        if (rpt.length==0) return;
        var j=0, pr=0, pg=0, cm=0, rn= 0, b=0;
        rpt.forEach(function (item) {
            item.balance = item.jg - item.pr - item.cmt;
            item.rango = f1[0].value+'|'+f2[0].value;
            b+=item.balance;
            j+=item.jg;
            pr+= item.pr;
            cm+= item.cmt;
            rn+= item.rt;
        });

        var total = {
            j: j.format(2), pr: pr.format(2), b:b.format(2),cm:cm.format(2), r:rn.format(2)
        };
        $('#bheader').html(jsrender($('#rd-total'),total));

        $('#mnt-jugado').html(j.format(2));
        $('#mnt-premios').html(pr.format(2));
        $('#mnt-pagos').html(pg.format(2));
        $('#mnt-balance').html((b).format(2));

        $('#tg-descuento').html((cm+rn).format(2));
        $('#tg-comision').html(cm.format(2));
        $('#tg-renta').html(rn.format(2));

        var rank, bnc;
        //top jugado
        rank = rpt.slice();
        rank.sort(function (a, b) {
            return b.jg- a.jg;
        });
        bnc = rank[0];
        $('#tj-banca').html(bnc.desc);
        $('#tj-jugada').html(bnc.jg.format(2));
        $('#tj-balance').html(bnc.balance.format(2));

        //top ganancia
        rank = rpt.slice();
        rank.sort(function (a, b) {
            return b.balance- a.balance;
        });
        bnc = rank[0];
        $('#tg-banca').html(bnc.desc);
        $('#tg-jugada').html(bnc.jg.format(2));
        $('#tg-balance').html(bnc.balance.format(2));

        $('#reporte-body').html(jsrender($('#rd-reporte'),rpt));

        prepareDownload();
    }

    var formato = $('#formato');
    formato.change(prepareDownload);
    function prepareDownload() {
        var a = document.getElementById("exportar");
        a.href = "#reporte/general";
        var name = name = "SRQ - REPORTE "+fdata.inicio+"-"+fdata.fin+"."+formato.val();
        if (formato.val()=="json") {
            download("exportar",JSON.stringify(rpt,null,2),name,"text/plain");
        } else if (formato.val()=="csv") {
            notificacion("FORMATO NO DISPONIBLE");
        } else {
            html2canvas($("#print-img"), {
                onrendered: function (canvas) {
                    var myImage = canvas.toDataURL("image/png");
                    a.href = myImage;
                    a.download = name;
                }
            });
        }
    }

    if (args && args.length>1) {
        a = args[1].split("-");
        b = args[2].split("-");
        f1.datepicker('setDate',new Date(a[0],parseInt(a[1])-1,a[2]));
        f2.datepicker('setDate',new Date(b[0],parseInt(b[1])-1,b[2]));
        reporte.trigger("submit");
    }
}
nav.paginas.addListener("reporte/recogedor",reporteRecogedor_nav);

function reporteTaquilla_nav (p,args) {
    var taqID = args[0];
    var f1 = $('#reporte-fecha1');
    var f2 = $('#reporte-fecha2');
    var reporte = $('#reporte');
    var premios = $('#prm-select');
    var hbtaq = $('#hb-taquilla');
    var rpt;

    var bancas = $('#bancas');
    bancas.html(jsrender($('#rd-banca-option'),$bancas));
    bancas.on("change", function () {
        hbtaq.html('<i class="fa fa-spinner fa-spin" ></i> Espere, recibiendo taquillas...');
        socket.sendMessage("taquillas", {bancaID:bancas.val()}, function (e, d) {
            $('#taquillas').html(jsrender($('#rd-taquilla-option'),d));
            hbtaq.remove();
        });
    });
    bancas.trigger("change");

    reporte.submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var f = formLock(this);
        data.taquillaID = taqID;
        socket.sendMessage("reporte-taquilla",data, function (e, d) {
            formLock(f,false);
            d = d || [];
            rpt = d;
            var j=0, pg= 0, pr = 0, cm=0;
            d.forEach(function (item) {
                item.balance = item.jugada-item.premio;
                j+=item.jugada;
                pg+=item.pago;
                pr+=item.premio;
                cm+=item.comision;
            });

            $('#mnt-jugado').html(j.format(2));
            $('#mnt-premios').html(pr.format(2));
            $('#mnt-pagos').html(pg.format(2));
            $('#mnt-balance').html((j-pr-cm).format(2));


            $('#tg-descuento').html((cm).format(2));
            $('#tg-comision').html(cm.format(2));

            var rank, bnc;
            //top jugado
            rank = d.slice();
            rank.sort(function (a, b) {
                return b.jugada- a.jugada;
            });
            bnc = rank[0];
            $('#tj-banca').html(bnc.descripcion);
            $('#tj-jugada').html(bnc.jugada.format(2));
            $('#tj-balance').html(bnc.balance.format(2));

            //top ganancia
            rank = d.slice();
            rank.sort(function (a, b) {
                return b.balance- a.balance;
            });
            bnc = rank[0];
            $('#tg-banca').html(bnc.descripcion);
            $('#tg-jugada').html(bnc.jugada.format(2));
            $('#tg-balance').html(bnc.balance.format(2));

            updateView();
        })
    });
    premios.change(updateView);

    function updateView () {
        $('#reporte-body').html(jsrender($('#rd-reporte'),rpt));
    }

    if (args && args.length>0) {
        var a = args[1].split("-");
        var b = args[2].split("-");
        f1.datepicker('setDate',new Date(a[0],parseInt(a[1])-1,a[2]));
        f2.datepicker('setDate',new Date(b[0],parseInt(b[1])-1,b[2]));
        reporte.trigger("submit");
    }
}
nav.paginas.addListener("reporte/taquilla",reporteTaquilla_nav);

function reporteCobros_nav (p,args) {
    var f1 = $('#reporte-fecha1');
    var f2 = $('#reporte-fecha2');
    var reporte = $('#reporte');
    var rdata;
    _helpers.rgFiltro = function () {
        return (f1.val() && f2.val())?"|"+f1.val()+"|"+f2.val():'';
    };
    reporte.submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var f = formLock(this);
        var grp = $('#rp-agrupar').val();
        socket.sendMessage("reporte-cobros",{s:data,g:grp}, function (e, d) {
            formLock(f,false);
            var lazy = [];
            if (!d) {
                $('#reporte-body').html('');
                $('.clr').html('--');
                return;
            }
            rdata = d;
            var j=0, cm= 0, pt=0;
            d.forEach(function (item) {
                j+=item.jg;
                cm += item.jg*item.cm;

                if (item.hasOwnProperty("cm") && item.cm==0 && item.hasOwnProperty("cID")) {

                    $('#rnt'+item.cID).html('<i class="fa fa-spinner fa-spin"></i>');

                    lazy.push(item.cID);
                }
            });
            lazyLoad();

            $('#mnt-jugado').html(j.format(2));

            var rank, bnc;
            //top jugado
            rank = d.slice();
            rank.sort(function (a, b) {
                return b.renta- a.renta;
            });
            bnc = rank[0];
            $('#tj-banca').html(bnc.desc);

            $('#tj-jugada').html(bnc.jg.format(2));
            $('#renta').html(cm.format(2));

            $('#reporte-body').html(jsrender($('#rd-reporte'),d));

            $('.cbr-folder').click(function (e) {
                e.preventDefault(e);
                var o = parseInt($(this).attr("fld"));
                $(this).attr("fld",o==1?0:1);
                var fld = parseInt($(this).attr("fldid"));
                if (o==0) {
                    $('.subrow'+fld).removeClass('hidden');
                    $(this).find('i').addClass('fa-folder-open');
                }
                else {
                    $('.subrow'+fld).addClass('hidden');
                    $(this).find('i').removeClass('fa-folder-open');
                }
            });

            function lazyLoad() {
                if (lazy.length>0) {
                    var id = lazy.shift();
                    var sdata = copyTo(data);
                    sdata.cid = id;
                    socket.sendMessage("reporte-subcobros", {s: sdata, g: 2}, function (e, d) {
                        var cm2 = 0;
                        d.forEach(function (sitem) {
                            sitem.cID = id;
                            cm2 += sitem.jg * sitem.cm;
                        });
                        cm += cm2;
                        $('#rnt' + id).html(cm2.format(2));
                        $('#renta').html(cm.format(2));

                        var b = jsrender($('#rd-reporte'), d);
                        $(b).insertAfter('#c' + id);

                        $('.cbr-shutdown').off('click');
                        $('.cbr-shutdown').click(function (e) {
                            e.preventDefault(e);
                            alert('Oops.. Esto aun no funciona ;) vuelva pronto...');
                        })
                        $('#cbrfi'+id).switchClass('fa-folder-o','fa-folder');

                        $('.cbr-disable').off("click");
                        $('.cbr-disable').click(function (e) {
                            e.preventDefault(e);
                            var uID = $(this).attr('usID');
                            var row = $('#'+uID);
                            var cbr = $('#cbrbal-'+uID);
                            cbr.toggleClass('cbr-bal-act');
                            if (cbr.hasClass('cbr-bal-act')) row.css('opacity',1);
                            else row.css('opacity',0.5);
                        })

                        $('.cbr-bal').off("click");
                        $('.cbr-bal').on('click', function (e) {
                            e.preventDefault(e);
                            var id = $(this).attr('usID');
                            var m = parseFloat($(this).attr('monto'));
                            var d = "COBRO SRQ SEMANA "+f1.val()+"|"+f2.val()+" "+$(this).attr('desc');
                            socket.sendMessage('balance-add',{usID:id,monto:m,desc:d,cdo:1}, function (e, d) {
                                    $('#'+ d.usID).addClass('success');
                            });
                        })
                        lazyLoad();
                    });
                }
            }
        })
    });

    $('#rtp-desc-o').click(function (e) {
        e.preventDefault(e);
        rdata.sort(function (a,b) {
            var ret = 0;
            a = a.desc.toLowerCase();
            b = b.desc.toLowerCase();
            if(a > b)
                ret = 1;
            if(a < b)
                ret = -1;
            return ret;
        });
        $('#reporte-body').html(jsrender($('#rd-reporte'),rdata));
    });
    $('#cbr-procesar').click(function () {
        $(this).prop("disabled",1);
        var lz = [];
        $('.cbr-bal-act').each(function (idx,item) {
            lz.push(item);
        });
        lzLoad(lz.shift());
        function lzLoad (item) {
            var id = $(item).attr('usID');
            var m = parseFloat($(item).attr('monto'));
            var d = "COBRO SRQ "+f1.val()+"|"+f2.val()+", "+$(item).attr('desc');
            socket.sendMessage('balance-add',{usID:id,monto:m,desc:d,cdo:1}, function (e, d) {
                $('#'+ d.usID).addClass('success');
                if (lz.length>0) lzLoad(lz.shift())
                else $('#cbr-procesar').prop("disabled",0);
            });
        }
    })
    if (args && args.length>0) {
        var a = args[0].split("-");
        var b = args[1].split("-");
        f1.datepicker('setDate',new Date(a[0],parseInt(a[1])-1,a[2]));
        f2.datepicker('setDate',new Date(b[0],parseInt(b[1])-1,b[2]));
        reporte.trigger("submit");
    }
}
nav.paginas.addListener("reporte/cobros",reporteCobros_nav);

function reporteCobrosComercial_nav (p,args) {
    var f1 = $('#reporte-fecha1');
    var f2 = $('#reporte-fecha2');
    var reporte = $('#reporte');
    var rdata;
    _helpers.rgFiltro = function () {
        return (f1.val() && f2.val())?"|"+f1.val()+"|"+f2.val():'';
    };
    reporte.submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var f = formLock(this);
        var grp = $('#rp-agrupar').val();
        socket.sendMessage("reporte-cobros",{s:data,g:grp}, function (e, d) {
            formLock(f,false);
            if (!d) {
                $('#reporte-body').html('');
                $('.clr').html('--');
                return;
            }
            rdata = d;
            var j=0, pr=0, cm= 0, pt=0;
            d.forEach(function (item) {
                item.balance = item.jugada-item.premio;
                j+=item.jugada;
                pr+=item.premio;
                cm+= item.renta;
                pt+= item.balance*item.participacion;
            });

            $('#mnt-jugado').html(j.format(2));
            $('#mnt-premios').html(pr.format(2));

            var rank, bnc;
            //top jugado
            rank = d.slice();
            rank.sort(function (a, b) {
                return b.renta- a.renta;
            });
            bnc = rank[0];
            $('#tj-banca').html(bnc.desc);
            $('#tj-jugada').html(bnc.jugada.format(2));

            //top ganancia

            $('#renta').html(cm.format(2));

            $('#reporte-body').html(jsrender($('#rd-reporte'),d));
        })
    });

    $('#rtp-desc-o').click(function (e) {
        e.preventDefault(e);
        rdata.sort(function (a,b) {
            var ret = 0;
            a = a.desc.toLowerCase();
            b = b.desc.toLowerCase();
            if(a > b)
                ret = 1;
            if(a < b)
                ret = -1;
            return ret;
        });
        $('#reporte-body').html(jsrender($('#rd-reporte'),rdata));
    });

    if (args && args.length>0) {
        var cid = args[0];
        var a = args[1].split("-");
        var b = args[2].split("-");
        f1.datepicker('setDate',new Date(a[0],parseInt(a[1])-1,a[2]));
        f2.datepicker('setDate',new Date(b[0],parseInt(b[1])-1,b[2]));
        reporte.trigger("submit");
    }
}
nav.paginas.addListener("reporte/cobros-comercial",reporteCobrosComercial_nav);

function reporteBalance_nav (p,args) {
    var user, usData, pendientes;

    if (args && args.length > 0) {
        $('.bl-dreg').each(function () {
            $(this).removeClass('hidden');
        });
        $('.bl-greg').each(function () {
            $(this).addClass('hidden');
        })
        a = args[0].slice(1);
        user = findBy("usuarioID",a,$usuarios);
        if (user) balance();
        else socket.sendMessage('usuarios',{id:a}, function (e, d) {
            user = d[0];
             balance(); 
        })

        function balance () {
            $('#bl-us-name').html(user.nombre);
            $('#bl-clients-total').html('Cargando...');
            socket.sendMessage('balance-general', {usID:user.usID}, function (e, d) {
                usData = d || [];
                if (usData.length>0) {
                    $('#reporte-body').html(jsrender($('#rd-reporte-us'), usData));
                    $('#bl-clients-total').html(usData[0].balance.format(2));
                } else {
                    $('#bl-clients-total').html('0.00');
                }
                
                $('.bl-pagar').click(balance_pago_click);
            });
        }
    } else {
        $('.bl-dreg').addClass('hidden');
        $('.bl-greg').removeClass('hidden');
        var reporte;
        socket.sendMessage('balance-general', null, function (e, d) {
            reporte = d || [];
            $('#reporte-body').html(jsrender($('#rd-reporte'), d));

            $('.umenu').click(function (ev) {
                ev.preventDefault(ev);
                askmenu("MULTI MENU",jsrender($('#rd-usermenu'),$usuario), function (btn) {
                    console.log(btn);
                },$('#md-ask-menu'));
            });

            var tc = 0;
            d.forEach(function (item) {
                tc = tc + item.balance;
            });
            $('#bl-clients-total').html(tc.format(2));

            var now = new Date;
            var fin = now.format();
            now.setTime(now.getTime()-86000000*7);
            var inicio = now.format()
            reporte_pagos(inicio,fin);
            $('#desde').val(inicio);
            $('#hasta').val(fin);
        });

        $('#bl-sort-desc').click(function (e) {
            e.preventDefault(e);
            var ord = parseInt($(this).attr('ord'));
            ord = ord==0?-1:ord;
            $(this).attr('ord',ord*-1);
            reporte.sort(function (a, b) {
                return a.desc.toLowerCase() < b.desc.toLowerCase()?ord:ord*-1;
            })
            $('#reporte-body').html(jsrender($('#rd-reporte'), reporte));
        });
        $('#bl-sort-monto').click(function (e) {
            e.preventDefault(e);
            var ord = parseInt($(this).attr('ord'));
            ord = ord==0?-1:ord;
            $(this).attr('ord',ord*-1);
            reporte.sort(function (a, b) {
                return a.balance < b.balance?ord:ord*-1;
            })
            $('#reporte-body').html(jsrender($('#rd-reporte'), reporte));
        })

        function reporte_pagos (inicio,fin) {
            socket.sendMessage('balance-pagos',{'inicio':inicio,'fin':fin}, function (e, d) {
                if (!d) return;
                $('#bl-pagos').html(jsrender($('#rd-reporte-pagos'),d));
                var total=0;
                d.forEach(function (item) {
                    total+= item.monto;
                });
                $('#bl-pagos-total').html(total.format(2));

                reporte_ppagos();
            });
        }
        function reporte_ppagos () {
            socket.sendMessage('balance-ppagos',null, function (e, balPend) {
                updateView();

                function updateView () {
                    $('#bl-ppagos').html(jsrender($('#rd-reporte-pend'),balPend));
                    var total=0;
                    balPend.forEach(function (item) {
                        total+= item.monto;
                    });
                    $('#bl-ppagos-total').html(total.format(2));
                    $('.cf-pago').click(function (e) {
                        e.preventDefault(e);
                        var id = $(this).attr('bid');
                        var pago = findBy("balID",id,balPend);
                        askme("CONFIRMAR PAGO #"+pago.balID,jsrender($('#rd-procesar-pendiente'),pago),{
                            ok: function (data) {
                                $('#cf-label').html('Espere.. confirmando pago.');
                                var b = findBy("balID",id,balPend);
                                var data = {
                                    bID:id,
                                    usID: b.usID,
                                    monto:data.monto
                                }
                                socket.sendMessage('balance-confirmacion',data, function (e, d) {
                                    $('#md-ask').modal('hide');
                                    nav.url("reporte/balance",[b.usID]);
                                })
                                return false;
                            }
                        })
                    })
                    $('.bl-rmv-pend').click(function (e) {
                        e.preventDefault(e);
                        var id = $(this).attr('balID');
                        socket.sendMessage('balance-remover-pend',{bID:id}, function (e, d) {
                            if (confirm('Confirma remover pago pendiente?')) {
                                var idx = findIndex("balID", id, balPend);
                                balPend.splice(idx, 1);
                                updateView();
                            }
                        })
                    });
                }
            });
        }
    }
    $('#bl-new-reg').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var f = formLock(this);
        balance_add(data.desc,data.monto,1);
        formReset(f);
    });
    $('#bl-fpagos').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        reporte_pagos(data.inicio,data.fin);
    })

    function balance_pago_click (e) {
        e.preventDefault(e);
        var pago = $(this).attr('pago');
        var data = findBy("balID",pago,usData);
        askme("CONFIRMAR PAGO #"+pago,jsrender($('#rd-procesar-pago'),data),{
            ok: function (result) {
                var monto = parseFloat(result.monto)*-1;
                balance_add("PAGO:"+result.id+" B:"+padding(result.origen,4)+"-"+padding(result.destino,4)+" R:"+result.recibo+" F:"+result.fecha,monto,result.cdo);
                return true;
            }
        });
    }
    function balance_add (descripcion,monto,confirmado) {
        var data = {
            desc:descripcion,
            monto:monto,
            usID:user.usID,
            cdo:confirmado
        }
        socket.sendMessage('balance-add',data, function (e, d) {
            if (usData.length>0) {
                d.balance = d.monto + (usData[0].balance);
            } else {
                d.balance = d.monto
            };
            usData.unshift(d);
            $('#reporte-body').html(jsrender($('#rd-reporte-us'), usData));
            $('#bl-clients-total').html(d.balance.format(2));
            $('.bl-pagar').click(balance_pago_click);
        });
    }
}
nav.paginas.addListener("reporte/balance",reporteBalance_nav);

function ticketsAnular (p,args) {
    $('#anular').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var a = data.tickets.split(","); var c;
        for (var i = a.length-1; i>-1; i--) {
            if (a[i].indexOf("-")>-1) {
                c = a[i].split("-");
                a.splice(i,1);
                for (var j = c[1]; j >= c[0]; j--) a.splice(i,null,j);
            }
        }
        socket.sendMessage("venta-anular",a, function (e, d) {
            notificacion(d+" TICKETS ANULADOS");
        })
    });

    function corrida (a,b) {
        var c = [];
        for (var i = a; i <= b; i++) c.push(i);
        return c;
    }
}
nav.paginas.addListener("tickets/anular",ticketsAnular);

function sql_nav (p,args) {
    var form = $('#sql');
    var mime = 'text/x-mariadb';
    window.editor = CodeMirror.fromTextArea(document.getElementById('textsql'), {
        mode: mime,
        indentWithTabs: true,
        smartIndent: true,
        lineNumbers: true,
        matchBrackets : true,
        autofocus: true,
        extraKeys: {"Ctrl-Space": "autocomplete"},
        hintOptions: {tables: {
            users: ["name", "score", "birthDate"],
            countries: ["name", "population", "size"]
        }}
    });
    updateUlt();

    var cc=0;
    var sqlq, sqlqi=0;
    form.submit(function (e) {
        sqlqi = 0;
        cc=0;
        e.preventDefault(e);
        var data = formControls(this);
        formLock(this);
        sqlq = data.sql.split(";\n");

        $('#sqlresult').html('');
        socket.addListener("sql-command",result);

        socket.sendMessage("sql-command",{sql:sqlq[0]});

    });
    function result (e,d) {

        if (d.code==1) {
            if (d.last==1) {
                formLock(form,false);
                $('#ultimos').append(jsrender($('#rd-usql-s'),d));
                updateUlt();
                socket.removeListener("sql-command",result);
                nqueue();
                return;
            }
            var html="", o;
            cc+= d.d.length;
            var f = d.d[0];
            html = '<tr>';
            for (o in f) {
                html+='<th>'+o+'</th>';
            }
            html += '</tr>';
            $('#sqlhead').html(html);
            html = '';
            d.d.forEach(function (item) {
                html += "<tr>";
                for (o in item) {
                    html += '<td>'+item[o]+'</td>';
                }
                html += "</tr>";
            });
            $('#sqlresult').append(html);
            $('#result').html(cc);
        } else if (d.code==5) {
            formLock(form,false);
            socket.removeListener("sql-command",result);
            alert("ERROR: "+ d.error.errorID+", "+ d.error.details);
            $('#ultimos').append(jsrender($('#rd-usql-f'),d));
            updateUlt();
            nqueue();
        }

    }

    function updateUlt () {
        var btnsq = $('.btnsql');
        btnsq.off("click");
        btnsq.click(function () {
            window.editor.setValue($(this).html());
        });
    }
    function nqueue() {
        if (++sqlqi<sqlq.length) {
            socket.addListener("sql-command",result);
            socket.sendMessage("sql-command",{sql:sqlq[sqlqi]});
        }
    }
}
nav.paginas.addListener('sql',sql_nav);

function midas_nav (p, args) {
    var mform = $('#midas');
    var ejgc = $('#jgc'), eprc = $('#prc');
    mform.submit(function (e) {
        e.preventDefault(e);

        var data = formControls(this);
        formLock(this);
        socket.sendMessage("sys-midas", data, function (e, d) {
            formLock(mform,false);
            if (d==null) return;

            var len = d.length;
            var jg=0, rjg=0;
            var pr=0; rpr=0;
            var st=0; rst=0;
            var diff=[];

            for (var i=0;i<len;i++) {
                st+= d[i].es?1:0; rst+= d[i].rs?1:0;
                jg+= d[i].ej; rjg+= d[i].rj;
                pr+= d[i].ep; rpr+= d[i].rp;
                if (d[i].ej!=d[i].rj || d[i].ep!=d[i].rp) {
                    diff.push(d[i]);
                }
            }

            var jgc = jg==rjg;
            var prc = pr==rpr;

            $('#st').html(st);
            $('#jg').html(jg.format(2));
            $('#pr').html(pr.format(2));

            $('#rst').html(rst);
            $('#rjg').html(rjg.format(2));
            $('#rpr').html(rpr.format(2));

            if (jgc) {
                ejgc.html('JUGADA COINCIDE');
                ejgc.addClass("alert-success");
            } else {
                ejgc.html('JUGADA NO COINCIDE');
                ejgc.addClass("alert-danger");
            }
            if (prc) {
                eprc.html('PREMIOS COINCIDEN');
                eprc.addClass("alert-success");
            } else {
                eprc.html('PREMIOS NO COINCIDEN');
                eprc.addClass("alert-danger");
            }

            var rdm=$('#rd-midas');
            $('#tb-dif').html(jsrender(rdm,diff));
            $('#tb-midas').html(jsrender(rdm,d));

            $('.mds-sorteo').click(function (e) {
                e.preventDefault(e);
                var btn = $(this);
                var sid = btn.attr("mdssorteo");
                socket.sendMessage("sorteo",{sorteoID:sid}, function (e, d) {
                    $("a[mdssorteo='"+sid+"']").html("#"+sid+" "+d.descripcion);
                    //btn.html(d.descripcion);
                })
            })
        })
    })
}
nav.paginas.addListener("reporte/midas",midas_nav);

function monitorRendimiento_nav (p, args) {
    var msData = [], mstimer=0;
    var accData=[];
    $('#mt-ms').click(function () {
        if (mstimer==0) {
            $('#msicon').switchClass("fa-send","fa-spinner fa-spin");
            mstimer = setInterval(function () {
                socket.sendMessage("sys-monitor", {m: "ms"}, ms_result);
            }, 1000);
        } else {
            $('#msicon').switchClass("fa-spinner fa-spin","fa-send");
            clearInterval(mstimer);
            mstimer=0;
        }
    });
    function ms_result (e, d) {
        $('#msmax').html(d.max);
        if (msData.length>0 && d.desc==msData[0].d) return;
        msData.unshift({d: d.desc, ms:d.last});
        $('#mt-msbody').html(jsrender($('#rd-msbody'),msData));
    }

    $('#mt-acc').click(function () {
        socket.sendMessage("sys-monitor",{m:"acc"}, function (e, d) {
            var p; accData.length=0;
            for (p in d) {
                accData.push({d:p,n:d[p]})
            }
            accData.sort(sortacc);
            $('#mt-accbody').html(jsrender($('#rd-accbody'),accData));
        })
    });

    function sortacc (a,b) {
        if (a.n > b.n) return -1;
        else if (a.n < b.n) return 1;
        else return 0;
    }
}
nav.paginas.addListener("sistema/monitor",monitorRendimiento_nav);

function sysMant_nav (p, args) {
    $('#sys-mant-run').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var f = formLock(this);
        socket.sendMessage("sys-mant",data, function (e, d) {
            formLock(f,false);
            if (d.code==1) {
                var ms = d.meta[0];
                ms = ms<1000?ms+"ms":(ms/1000).format()+"s";
                notificacion("MANTENIMIENTO FINALIZADO",jsrender($('#rd-mant-ok'), {
                    tiempo: ms,
                    tickets: d.meta[1],
                    ventas: d.meta[2],
                    anulados: d.meta[3],
                    pagos: d.meta[4]
                }),null,true);
            }
            else notificacion("MANTENIMIENTO FINALIZADO","FALLIDA");
        })
    });
}
nav.paginas.addListener("sistema/mantenimiento",sysMant_nav);

function bancasRelacionPremio_nav (p,args) {
    var bancas = $('#bancas'), sorteo = $('#sorteo'), relacion = $('#relacion'), usuarios = $('#usuarios');
    bancas.html(jsrender($('#rd-banca-option'),$bancas));

    sorteo.html(jsrender($('#rd-lsorteo-option'),$sorteos));

    relacion.submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        formLock(relacion);
        socket.sendMessage('banca-relacion',data, function (e,d) {
            formLock(relacion,false);
            if (d>0) notificacion('RELACION PROCESADA CON EXITO');
        })
    });

    if ($usuarios) updateView();
    else socket.sendMessage('usuarios', null, function (e, d) { $usuarios = d || []; updateView(); });

    function updateView() {
        usuarios.html(jsrender($('#rd-usuario-option'),$usuarios));
        usuarios.select2("val",0);
        usuarios.change(function () {
            bancas.html('<option disabled>CARGANDO...</option>');
            bancas.select2("val",0);
            socket.sendMessage('bancas', {usuario:usuarios.val()}, function (e, d) {
                bancas.html(jsrender($('#rd-banca-option'),d));
            });
        });
    }
}
nav.paginas.addListener('bancas/relacionpremio',bancasRelacionPremio_nav);