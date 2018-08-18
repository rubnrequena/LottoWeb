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
    select2w($('.s2'),{allowClear:true});

    // Minimize Button in Panels
    jQuery('.minimize').click(function(){
        var t = jQuery(this);
        var p = t.closest('.panel');
        if(!jQuery(this).hasClass('maximize')) {
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
                    }
                    rdia.push({
                        sorteoID:"",
                        sorteo:"TOTAL",
                        jugado:t1,
                        premio:t2,
                        pago:t3
                    });
                    $('#srt_dia').html(jsrender($('#rd-sorteos-dia-row'), d.data, hlp));
                }
                $('#str-dia-stamp').html((new Date(d.time).format('hh:MM TT')))
            });
        }
    })
}

function sorteoMonitor_nav(e,arg) {
    var fecha = $('#sfecha');
    var d = new Date();
    var data;
    listarSorteos(d.format());

    $('#ord-num-num').click(function (e) {
        e.preventDefault(e);
        $('.order-num').removeClass('btn btn-primary btn-sm');
        $(this).addClass('btn btn-primary btn-sm');
        data.n.sort(function (a,b) {
            return a.numero- b.numero;
        });
        $("#numeros-body").html(jsrender($('#rd-vtnum-row'), data.n));
    });
    $('#ord-num-jg').click(function (e) {
        e.preventDefault(e);
        $('.order-num').removeClass('btn btn-primary btn-sm');
        $(this).addClass('btn btn-primary btn-sm');
        data.n.sort(function (a,b) {
            return b.jugada- a.jugada;
        });
        $("#numeros-body").html(jsrender($('#rd-vtnum-row'), data.n));
    });
    fecha.on("change", function (e) {
        listarSorteos(e.target.value);
    });
    $('#monitor-form').submit(function (e) {
        e.preventDefault(e);
        var dataForm = formControls(this);
        var f = formLock(this);
        socket.sendMessage("monitor",dataForm, function (e, d) {
            formLock(f,false);
            data = d || [];
            var now = new Date();
            $("#ultact").html(now.format('dd/mm/yy hh:MM:ss TT'));

            var jg=0;
            var ld = d.t[0];
            d.t.forEach(function (item) {
                jg+=item.jugada;
                if (item.jugada>ld.jugada) ld = item;
            });

            $("#jugada").html(jg.format(0));
            $("#bnLider").html(ld.banca);
            $("#bnLider-jg").html(ld.jugada.format(0));

            ld = d.n[0];
            d.n.forEach(function (item) {
                item.pcj = item.jugada*100/jg;
                if (item.jugada>ld.jugada) ld = item;
            });
            $("#numLider").html(ld.desc);
            $("#numLider-jg").html(ld.jugada.format(0));

            $("#ventas-body").html(jsrender($('#rd-ventas-row'),d.t));
            $("#numeros-body").html(jsrender($('#rd-vtnum-row'),d.n));
        })
    });

    function listarSorteos (fecha) {
        socket.sendMessage("sorteos",{lista:fecha}, function (e, d) {
            var sorteo = $('#ssorteos');
            sorteo.html(jsrender($('#rd-sorteo-option'),d));
            sorteo.select2("val", "");
        })
    }

    if (arg && arg.length>0) {
        var a = arg[0].split("-");
        fecha.datepicker('setDate',new Date(a[0],parseInt(a[1])-1,a[2]));
        fecha.trigger('change');
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
    $('#sorteo-buscar').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var f = formLock(this);
        socket.sendMessage("sorteos",data, function (e, d) {
            formLock(f,false);
            $('#sorteos-body').html(jsrender($('#rd-sorteo-row'),d || [],help));

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
                var sr = findBy("sorteoID",sorteo,d);
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
                        var r = confirm('Este sorteo ya esta premiado, desea reiniciarlo y volver a premiar');
                        if (r) {
                            socket.sendMessage("sorteo-reiniciar", {sorteoID:data.sorteoID}, function (e, d) {
                                notificacion("SORTEOS", "SORTEO #" + data.sorteoID + " REINICIADO SATISFACTORIAMENTE");
                                premiar(data,elm);
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
        })
    })
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
    $('#sorteos').html(jsrender($('#rd-lsorteo-option'),$sorteos));

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
    var sorteos;
    var sorteo = $('#sorteos');
    socket.sendMessage("lsorteos",null,function (e,d) {
        sorteos = d;
        $('#sorteos').html(jsrender($('#rd-sorteo'),sorteos));
        sorteo.select2("val","");
    });

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

    function elementos() {
        var id = sorteo.val();
        var el = $elementos.filter(function (item) {
            return item.sorteo==id;
        });
        $('#elementos-body').html(jsrender($('#elemento-row'),el));
    }
    elementos();
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
        $usuarios = d || []; updateView();
    });
    function updateView() {
        $('#usuarios-body').html(jsrender($('#rd-usuario-row'), $usuarios));
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

function bancasComercial_nav (p,args) {
    var usuario, bancas, taquillas,usuarios = $('#usuarios');

    usuarios.html(jsrender($('#rd-usuario-option'),$usuarios));
    $('#usuario-editar').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        data.usuarioID = usuario.usuarioID;
        data.participacion = 0;
        data.comision = 0;
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
            data.renta = usuario.renta;
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
            usuarios.html(jsrender($('#rd-usuario-option'),$usuarios));
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
            $('#bn-comision').prop("disabled",this.value==0);
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
                var banca = findBy("bancaID",id,$bancas);
                socket.sendMessage("banca-editar",{bancaID:banca.bancaID,activa:act}, function (e, d) {
                    if (d.code==1) {
                        if (d.hasOwnProperty("activa")) banca.activa = d.activa;
                        if (d.hasOwnProperty("nombre")) banca.nombre = d.nombre;
                        if (d.hasOwnProperty("clave")) banca.clave = d.clave;
                    }
                    else {
                        alert("ERROR AL MODIFICAR ESTADO ACTIVO DE BANCA")
                    }
                })
            });
        }
    } else {
        nav.nav("406");
    }
}
nav.paginas.addListener("bancas/banca",bancasBanca_nav);

function bancasTaquillas_nav(p,args) {
    var taquillas;
    function sobreNombres() {
        $('.banca-celda').each(function (index) {
            var me = $(this);
            me.html(findBy("bancaID",parseInt(me.html()),$bancas).nombre);
        })
    }
    function updateView () {
        $('#taquillas-body').html(jsrender($('#rd-taquilla-row'),taquillas));
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
        toggles.on("toggle", function (e,act) {
            var id = $(e.target).data('target');
            var taquilla = findBy("taquillaID",id,taquillas);
            socket.sendMessage("taquilla-editar",{taquillaID:taquilla.taquillaID,activa:act}, function (e, d) {
                if (d.ok) taquilla.activa = act;
                else {
                    alert("ERROR AL MODIFICAR ESTADO ACTIVO DE TAQUILLA")
                }
            })
        });

        //estadisticas
        var activas= 0, bnc = [];
        taquillas.forEach(function (item) {
            if (item.activa) activas++;
            if (bnc.indexOf(item.bancaID)==-1) {
                bnc.push(item.bancaID);
            }
        });
        $('#totalTaquillas').html(taquillas.length);
        $('#taqAct').html(activas);
        $('#taqInac').html(taquillas.length-activas);
        $('#totalBancas').html(bnc.length);

        if ($bancas) sobreNombres();
        else {
            var hlp = $('#taquillas-hlp');
            hlp.html("<i class='fa fa-spinner fa-spin'></i> Espere, recibiendo lista de bancas");
            socket.sendMessage('bancas-nombres',null, function (e,d) {
                hlp.remove();
                $bancas = d;
                sobreNombres();
            })
        }
    }
    if (taquillas) {
        updateView();
    } else {
        taquillas = [];
        socket.addListener("taquillas", function (e, d) {
            taquillas = taquillas.concat(d);
            updateView();
        });
        socket.sendMessage("taquillas",null);
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
            var j=0, pr=0, pg=0, cm=0, rn=0;
            d.forEach(function (item) {
                item.balance = item.jugada-item.premio-item.comision-item.renta;
                j+=item.jugada;
                pr+=item.premio;
                pg+= item.pago;
				cm+= item.comision;
				rn+= item.renta;
            });

            $('#mnt-jugado').html(j.format(0));
            $('#mnt-premios').html(pr.format(0));
            $('#mnt-pagos').html(pg.format(0));

            var rank, bnc;
            //top jugado
            rank = d.slice();
            rank.sort(function (a, b) {
                return b.renta- a.renta;
            });
            bnc = rank[0];
            $('#tj-banca').html(bnc.desc);
            $('#tj-jugada').html(bnc.jugada.format(0));
            $('#tj-renta').html(bnc.renta.format(0));

            //top ganancia
            
            $('#comision').html(cm.format(0));
            $('#renta').html(rn.format(0));

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
            $('#jg').html(jg.format(0));
            $('#pr').html(pr.format(0));

            $('#rst').html(rst);
            $('#rjg').html(rjg.format(0));
            $('#rpr').html(rpr.format(0));

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