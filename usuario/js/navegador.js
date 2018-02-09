nav.paginas.addListener(Navegador.ENTER, function (p,a) {
    console.log(p,a);

    // Adjust mainpanel height
    var main = jQuery('.mainpanel');
    var docHeight = jQuery(document).height();
    var mh = main.height();
    if (docHeight > mh)
        main.height(docHeight);

    $('.date').datepicker({
        dateFormat:'yy-mm-dd'
    });

    $('.now').datepicker('setDate',new Date());;

    $('.s2-elementos').html(jsrender($('#rd-elemento-option'),$elementos));
    $('.s2-bancas').html(jsrender($('#rd-banca-option'),$bancas));
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
});

nav.paginas.addListener("login",login_nav);
function login_nav(p,arg) {
    $('#login-form').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var f = formLock(this);
        socket.sendMessage("login",data,function (e,d) {
            formLock(f,false);
            var recordar = $('#recordar').prop("checked");
            if (recordar) storage.setItem("loto_uslogin",JSON.stringify(data));
            else storage.removeItem("loto_uslogin");
        });
    });
}

nav.paginas.addListener("inicio",inicio_nav);
function inicio_nav(p,arg) {
    var rdia;
    var hlp = copyTo(_helpers);
    hlp.ganador = function (n) {
        var e = findBy("id",n,$elementos);
        return e? '#'+e.n+' '+ e.d : '';
    };

    nav.paginas.addListener(Navegador.EXIT, function (e,p) {
        nav.paginas.removeListener(Navegador.EXIT,arguments.callee);
        if (p=="inicio") activo = false;
    });

    /*var activo = true;
    setTimeout(function () {
        if (activo==false) return;
        socket.sendMessage("inicio", null, function (e,d) {
            if (d.hasOwnProperty("code")) {

            } else {
                rdia = d.data;
                $('#srt_dia').html(jsrender($('#rd-sorteos-dia1-row'), d.data, hlp));
            }
            $('#str-dia-stamp').html((new Date(d.time).format('hh:MM TT')))
        });
    },3000);*/

    $('#btnload').click(function () {
        $("#inicio-sorteodia").html(jsrender($('#rd-pnlsorteo'),null));
        var col=false;
        $('#prm-col').click(function (e) {
            e.preventDefault(e);
            col = !col;
            $(this).find("a").html(col?"PREMIOS</br>PAGADOS":"PREMIOS</br>A PAGAR");
            if (col) $('#srt_dia').html(jsrender($('#rd-sorteos-dia1-row'), rdia, hlp));
            else $('#srt_dia').html(jsrender($('#rd-sorteos-dia2-row'), rdia, hlp));
        });

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
                    $('#srt_dia').html(jsrender($('#rd-sorteos-dia2-row'), d.data, hlp));
                }
                $('#str-dia-stamp').html((new Date(d.time).format('hh:MM TT')))
            });
        }
    })
}

function sorteoMonitor_nav() {
    var d = new Date();
    listarSorteos(d.format());
    var data;

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
    $('#ord-num-gb').click(function (e) {
        e.preventDefault(e);
        $('.order-num').removeClass('btn btn-primary btn-sm');
        $(this).addClass('btn btn-primary btn-sm');
        data.n.sort(function (a,b) {
            return b.glb- a.glb;
        });
        $("#numeros-body").html(jsrender($('#rd-vtnum-row'), data.n));
    });

    $('#monitor-form').submit(function (e) {
        e.preventDefault(e);
        $("#ventas-body").html('');
        $("#numeros-body").html('');
        $('.reset').html('--');

        var dataForm = formControls(this);
        var f = formLock(this);
        socket.sendMessage("monitor",dataForm, function (e, d) {
            formLock(f,false);
            data = d || [];
            var now = new Date();
            $("#ultact").html(now.format('dd/mm/yy hh:MM:ss TT'));

            if (data.t && data.n) {
                var jg = 0, tg = 0;
                var ld = data.t[0];
                data.t.forEach(function (item) {
                    jg += item.jugada;
                    if (item.jugada > ld.jugada) ld = item;
                });

                $("#jugada").html(jg.format(0));
                $("#bnLider").html(ld.banca);
                $("#bnLider-jg").html(ld.jugada.format(0));

                ld = data.n[0];
                data.n.forEach(function (item) {
                    tg += item.glb;
                });
                data.n.forEach(function (item) {
                    item.pcj = item.jugada * 100 / jg;
                    item.pcg = item.glb * 100 / tg;
                    if (item.jugada > ld.jugada) ld = item;
                });
                $("#numLider").html(ld.desc);
                $("#numLider-jg").html(ld.jugada.format(0));

                $("#ventas-body").html(jsrender($('#rd-ventas-row'), data.t));
                $("#numeros-body").html(jsrender($('#rd-vtnum-row'), data.n));
            }
        })
    });

    $('#sfecha').on("change", function (e) {
        listarSorteos(e.target.value);
    });
    function listarSorteos (fecha) {
        socket.sendMessage("sorteos",{fecha:fecha}, function (e, d) {
            var sorteo = $('#ssorteos');
            sorteo.html(jsrender($('#rd-sorteo-option'),d));
            sorteo.select2("val", "");
        })
    }
	
}
nav.paginas.addListener("sorteos/monitor",sorteoMonitor_nav);

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

function sorteoPublicar_nav(p,args) {
    var tq_srt, taquillas;
    var hlp = {
        taq: function (id) {
            if (id>0) {
                 var tq =  findBy("taquillaID",id,taquillas);
                return tq?tq.nombre:"ERROR: TAQ NO ENCONTRADA, ID:"+id;
            }
            else return "TODAS"; },
        srt: function (id) { return findBy("sorteoID",id,$sorteos) }
    };
    var bancas = $('#bancas'), taqs = $('#taquillas'), sorteos = $('#sorteos'), htaq = $('#hb-taquilla');

    bancas.html(jsrender($('#rd-banca-option'),$bancas));
    bancas.select2("val",0);
    bancas.on("change", function () {
        htaq.html('<i class="fa fa-spinner fa-spin"></i> Espere, recibiendo taquillas..');
        socket.sendMessage("taquillas", {bancaID:bancas.val()}, updateTaquillas);
    });

    sorteos.html(jsrender($('#rd-sorteos-option'),$sorteos));

    $('#reporte').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        data.bancaID = bancas.val();
        if (!data.hasOwnProperty("taquillas")) data.taquillas = [0];

        var i, j, ex=[];
        for (i=data.taquillas.length-1;i>=0;i--) {
            for (j=tq_srt.length-1;j>=0;j--) {
                if (data.taquillas[i]==tq_srt[j].taquilla && data.sorteo==tq_srt[j].sorteo) {
                    ex.push(tq_srt[j].ID);
                }
            }
        }

        if (ex.length>0) {
            notificacion("REGISTROS DUPLICADOS, POR FAVOR VERIFIQUE");
            ex.forEach(function (item, i) {
                $('#r'+item).addClass("danger");
            });
        } else {
            socket.sendMessage("publicar", data, function (e, d) {
                socket.sendMessage("sorteos-publicos",{bancaID:bancas.val()}, sorteos_publicos);
            })
        }
    });
    function sorteos_publicos (e, d) {
        tq_srt = d || [];
        updateView();
    }
    function updateView() {
        $('#tb-sorteos').html(jsrender($('#rd-srt-row'),tq_srt,hlp));
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
            var taquilla = findBy("ID",id,tq_srt);
            socket.sendMessage("pb_editar",{id:taquilla.ID,publico:act,bancaID:bancas.val()}, function (e, d) {
                taquilla.publico = act;
            })
        });

        $('.tqsrt_rem').on("click",remover_publicacion);
    }
    function remover_publicacion (e) {
        var _id = parseInt($(e.target).attr('sid'));
        socket.sendMessage('pb_remover',{id:_id,bancaID:bancas.val()}, function (e, d) {
            var i = findIndex("ID",_id,tq_srt);
            tq_srt.splice(i,1);
            updateView();
        });
    }
    function updateTaquillas (e,d) {
        htaq.html('');
        taquillas = d || [];
        taquillas.unshift({taquillaID:0,nombre:"TODAS"});
        taqs.html(jsrender($('#rd-taquilla-option'),taquillas));

        socket.sendMessage("sorteos-publicos",{bancaID:bancas.val()}, sorteos_publicos);
    }

    socket.sendMessage("taquillas", {bancaID:bancas.val()}, updateTaquillas);
}
nav.paginas.addListener("sorteos/publicar",sorteoPublicar_nav);

function sorteoPremiar_nav(p,args){
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
            if (d.code==1) {
                notificacion('SOLICITUD ACEPTADA', 'SORTEO PREMIADO, Gracias por su tiempo...');
            } else if (d.code==0) {
                notificacion('SOLICITUD ACEPTADA','Gracias por su tiempo...');
            }
            else if (d.code==4) notificacion("SORTEOS","SORTEO #"+data.sorteoID+" YA ESTA PREMIADO",'growl-danger');
            else if (d.code==5) notificacion("SOLICITUD RECHAZADA"," SORTEO #"+data.sorteoID+" SOLICITUD DUPLICADA",'growl-danger');
            else if (d.code==8) notificacion("SOLICITUD RECHAZADA"," SORTEO #"+data.sorteoID+" SORTEO ABIERTO",'growl-danger');
        })
    });

    function listarSorteos (fecha) {
        socket.sendMessage("sorteos",{fecha:fecha}, function (e, d) {
            sorteos = d || [];
            var sorteo = $('#premiar-sorteo');
            sorteo.html(jsrender(opt,sorteos));
            sorteo.select2("val", "");
        })
    }
    function listarNumeros (sorteo) {
        var srt = findBy("sorteoID",sorteo, sorteos);
        numeros.html(jsrender(rdElm,exploreBy('s',srt.sorteo,$elementos)));
    }
    var hoy = new Date().format();

    if ($elementos) {
        listarSorteos(hoy);
    } else {
        socket.sendMessage("elementos",null, function (e, d) {
            $elementos = d;
            listarSorteos(hoy);
        })
    }
}
nav.paginas.addListener("sorteos/premiar",sorteoPremiar_nav);

function bancasBancas_nav(p,args) {
    var multiplo = 0;
    var papelera = $('#papelera');

    papelera.change(function () {
        updateBancas();
    });

    $('.rdo-com').change(function () {
        multiplo = this.value;
        $('#bn-comision').prop("disabled",this.value==0);
    });
    $('#banca-nueva').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        data.usuarioID = $usuario.usuarioID;
        data.renta = $usuario.renta;
        data.comision = data.comision * multiplo;
        var form = formLock(this);
        socket.sendMessage("banca-nueva",data, function (e, d) {
            if (d>0) {
                formReset(form);
                data.bancaID = d;
                data.papelera = 0;
                $bancas.push(data);
                updateBancas();
                notificacion("BANCA NUEVA", "Banca registrada exitosamente");
            } else {
                formLock(form,false);
                notificacion("ERROR", "Banca no registrada, usuario duplicado",'growl-danger');
            }
        })
    });
    updateBancas();

    function updateBancas() {
        var _papelera = papelera.prop('checked');

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

        var psw = $('.password');
        psw.on('mouseover', function (e) {
            $(e.target).html($(e.target).data('clave'));
        });
        psw.on('mouseout', function (e) {
            $(e.target).html("***");
        });

        $('.bn-remove-req').click(function (e) {
            e.preventDefault(e);
            var bID = $(this).attr("bancaID");
            var r = confirm('Seguro desea eliminar esta banca? Tenga en cuenta que enviara a la papelera todas las taquillas asociadas.');
            if (r===true) {
                socket.sendMessage("banca-remover",{bancaID:bID,papelera:1}, function (e, d) {
                    if (d.code==1) {
                        var b = findBy("bancaID",bID,$bancas);
                        b.papelera = 1;
                        updateBancas();
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
                        var b = findBy("bancaID",bID,$bancas);
                        b.papelera = 0;
                        updateBancas();
                    }
                })
            }
            return false;
        });
    }
}
nav.paginas.addListener("bancas/bancas",bancasBancas_nav);

function bancasBanca_nav(p,args) {
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
        formSet(editar,banca,function (val,field) {
            if (field=="comision") return Math.abs(val*100);
            if (val===false) return 0;
            else if (val===true) return 1;
            else return val;
        });
        if (banca.comision==0) $('#radioNormal').prop('checked',true);
        else if (banca.comision>0) $('#radioRecogedor').trigger('click');
        else if (banca.comision<0) $('#radioReventa').trigger('click');

        socket.sendMessage("taquillas",{bancaID:banca.bancaID}, function (e, d) {
            taquillas = d || [];
            updateTaquillas();
        });

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
                }
            });
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
                    if (d.ok===1) taquilla.fingerlock = act;
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
    } else {
        nav.nav("406");
    }
}
nav.paginas.addListener("bancas/banca",bancasBanca_nav);

function bancasPermisos_nav (p,args) {
    var _permisos;
    var lpermisos = ["PUBLICAR SORTEOS","ACCEDER A TAQUILLAS","ACTIVAR TAQUILLAS","ACCEDER A TOPES","TAQUILLAS ACTIVADAS","TOPE GRUPO"];
    var hlp = {
        permiso: function (p) {
            return lpermisos[p-1];
        }
    };

    var _bancas = $bancas.slice();
    _bancas.unshift(
        {bancaID:0,nombre:"TODAS"}
    );
    $('#bancas').html(jsrender($('#rd-banca-option'),_bancas));

    $('#permisos').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        if (data.hasOwnProperty("permisos")) {
            socket.sendMessage("permiso-nuevo", data, function (e, d) {
                $('#permisos-table').html('');
                socket.sendMessage("permisos", null, function (e, d) {
                    _permisos = d || [];
                    updateView();
                });
            })
        } else {
            notificacion("SELECCIONE AL MENOS UN PERMISO","","growl-danger");
        }
    });

    socket.sendMessage("permisos",null, function (e, d) {
        _permisos = d || [];
        updateView();
    });

    function updateView () {
        $('#permisos-table').html(jsrender($('#rd-permiso-row'),_permisos,hlp));
        $('.permiso-remover').click(function (e) {
            e.preventDefault(e);
            var id = $(this).attr('metaID');
            socket.sendMessage("permiso-remove", {meta: id}, function (e, d) {
                if (d>0) {
                    var idx = findIndex("metaID",id,_permisos);
                    _permisos.splice(idx,1);
                    updateView();
                    notificacion("PERMISO REMOVIDO EXITOSO","","growl-success");
                }
                else notificacion("ERROR AL REMOVER PERMISO","","growl-danger");
            });
        });
        var toggles = $('.toggle');
        toggles.each(function (index) {
            var me = $(this);
            me.toggles({
                text: {
                    on: "SI",
                    off: "NO"
                },
                on: me.data('activa'),
                click: me.data('click')
            });
        });
        toggles.on("toggle", function (e, act) {
            var id = $(e.target).data('target');
            socket.sendMessage("permiso-update", {meta: id, valor: act}, function (e, d) {
                if (d>0) notificacion("CAMBIO DE PERMISO EXITOSO","","growl-success");
                else notificacion("ERROR AL CAMBIAR PERMISO","","growl-danger");
            })
        });
    }
}
nav.paginas.addListener("bancas/permisos",bancasPermisos_nav);

function bancasTaquillas_nav(p,args) {
    function updateView () {
        $('#taquillas-body').html(jsrender($('#rd-taquilla-row'),$taquillas));
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
            var taquilla = findBy("taquillaID",id,$taquillas);
            socket.sendMessage("taquilla-activa",{taquillaID:taquilla.taquillaID,activa:act}, function (e, d) {
                if (d.ok) taquilla.activa = act;
                else {
                    alert("ERROR AL MODIFICAR ESTADO ACTIVO DE TAQUILLA")
                }
            })
        });
    }
    if ($taquillas) updateView();
    else {
        socket.sendMessage("taquillas",null, function (e, d) {
            $taquillas = d;
            updateView();
        });
    }

    $('#taquilla-nueva').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var f = formLock(this);
        socket.sendMessage("taquilla-nueva",data, function (e, d) {
            formReset(f);
            $taquillas.push(d);
            updateView();
        })
    });
}
nav.paginas.addListener("bancas/taquillas",bancasTaquillas_nav);

function bancasTaquilla_nav(p,args) {
    var taquilla;
    var rm = $('#remover');
    if (args && args.length==1) {
        socket.sendMessage("taquillas",{id:args[0]}, function (e, d) {
            if (d) {
                taquilla = d[0];
                formSet($('#taquilla-nueva'), taquilla);
            } else {
                nav.nav("406");
            }
        });

        $('#taquilla-nueva').submit(function (e) {
            e.preventDefault(e);
            var data = formControls(this);
            data.taquillaID = taquilla.taquillaID;
            var f = formLock(this);
            socket.sendMessage("taquilla-editar",data, function (e, d) {
                formLock(f,false);
                if (d==1) {
                    notificacion('TAQUILLA','CAMBIOS REALIZADOS EXITOSAMENTE','growl-success');
                    $taquillas=null;
                } else {
                    notificacion("DISCULPE: USUARIO NO DISPONIBLE","","growl-danger");
                }
            })
        });
        $('#cambiar-clave').submit(function (e) {
            e.preventDefault(e);
            var data = formControls(this);
            data.taquillaID = taquilla.taquillaID;
            var f = formLock(this);
            socket.sendMessage("taquilla-editar",data, function (e, d) {
                formLock(f,false);
                if (d==1) {
                    notificacion('TAQUILLA','CAMBIO DE CLAVE EXITOSO','growl-success');
                    $taquillas=null;
                } else {
                    notificacion('CAMPOS INVALIDOS',"<p>CAMBIO DE CLAVE FALLIDO</p>",'growl-danger');
                }
            });
        });
        rm.click(function () {
            rm.prop("disabled",true);
            rm.html('<i class="fa fa-spinner fa-spin"></i> ESPERE, ESTO PUEDE TOMAR UN MOMENTO...');
            socket.sendMessage("taquilla-remover",{taquillaID:taquilla.taquillaID,papelera:1}, function (e, d) {
                if (d.code==5) {
                    notificacion("ACCION RECHAZADA", "<p>MOTIVO: Se ha detectado que esta taquilla no tiene mas de 10 dias de inactividad.</p><p>Inactividad: "+msToString(d.t)+"</p>", "growl-danger");
                    rm.prop("disabled",false);
                    rm.html('<i class="fa fa-trash"></i> ENVIAR A PAPELERA');
                }else {
                    if ($taquillas && $taquillas.length>0) {
                        var i = findIndex("taquillaID", taquilla.taquillaID, $taquillas);
                        $taquillas.splice(i, 1);
                    }
                    nav.back();
                }
            })
        });
    }
}
nav.paginas.addListener("bancas/taquilla",bancasTaquilla_nav);

function bancasTransferir_nav (p,args) {
    var bancas = $('.bnc'), taqs = $('#taquilla');
    bancas.html(jsrender($('#rd-banca-option'),$bancas));
    var reportes = $('#sreporte');
    $('#dbancas').on("change", function () {
        socket.sendMessage("taquillas", {bancaID:bancas.val()}, updateTaquillas);
    });

    function updateTaquillas (e,d) {
        taqs.html(jsrender($('#rd-taquilla-option'),d));
        taqs.select2('val',0);
    }
    socket.sendMessage("taquillas", {bancaID:bancas.val()}, updateTaquillas);

    $('#tranferir').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        if (data.desde==data.hasta) {
            notificacion("ASISTENTE","La banca de origen debe ser diferente a la banca destino");
        } else {
            socket.sendMessage("transferir",{taq:data,vnt:reportes.is(":checked")}, function (e, d) {
                if (d>0) {
                    var m = "- Agencia transferida con exito.";
                    if (d==2) m += '</br>- Ventas y reportes transferidos con exito.';
                    notificacion("TRANSFERENCIA EXITOSA",m);
                } else notificacion("TRANFERENCIA FALLIDA","Comuniquese con el administrador");
            })
        }
    });
}
nav.paginas.addListener("bancas/transferir",bancasTransferir_nav);

function bancasTopes_nav (p,args) {
    var sorteo = $('#sorteo'), taqs = $('#taquilla'), sorteos = $('#sorteos'), bancas = $('#bancas');
    var elemento = $('#elemento'), monto = $('#monto');
    var sfecha = $('#sorteo-fecha');

    var b = $bancas.slice();
    b.unshift({bancaID:0,nombre:""});
    bancas.html(jsrender($('#rd-banca-option'),b));
    bancas.select2("val","");
    bancas.on("change", function () {
        socket.sendMessage("taquillas", {bancaID:bancas.val()}, function (e, d) {
            d = d || [];
            d.unshift({taquillaID:0,nombre:"TODAS"});
            taqs.html(jsrender($('#rd-taquilla-option'),d));
            taqs.select2('val',0);

            socket.sendMessage("topes",{
                bancaID:bancas.val()
            }, dsp_topes);
        });
    });

    var srt = $sorteos.slice();
    srt.unshift({sorteoID:0,nombre:"TODOS"});
    sorteo.html(jsrender($('#rd-sorteos-option'),srt));
    sorteo.on("change", function () {
        var v = sorteo.val();
        var elem = exploreBy("s",v,$elementos);
        elem.unshift({id:0,d:"TODOS"});
        elemento.html(jsrender($('#rd-elemento-option'),elem));
        elemento.select2('val',0);

        dsp_sorteos(sDia);
    });
    sorteo.select2("val",0);
    sorteo.trigger("change");

    var help = {
        elm: function (n) {
            if (n==0) return "TODAS";
            else {
                var e = findBy("id", n, $elementos);
                return e?"#"+ e.n+ " " + e.d:"";
            }
        },
        srt: function (id) {
            if (id==0) return "TODOS";
            else return '<a href="#sorteo|'+id+'">#'+padding(id,5)+'</a>';
        }
    };
    var data;
    var sDia;

    function dsp_topes (e,d) {
        d.forEach(function (item) {
            if (item.sorteo>0) {
                item.nsorteo = findBy("sorteoID",item.sorteo,$sorteos).nombre;
            }
        });
        $('#topes-body').html(jsrender($('#rd-topes-row'),d||[],help));
        $('.tope-rem').click(function (e) {
            e.preventDefault(e);
            var b = $(this);
            var data = {};
            data.topeID = parseInt(b.attr('topeID'));
            data.taquillaID = parseInt(b.attr('taquillaID'));
            data.bancaID = parseInt(b.attr('bancaID'));
            socket.sendMessage("tope-remover",data,function (e,t) {
                $('#tope'+data.topeID).remove();
            });
        });
    }
    function dsp_sorteos (d) {
        if (!d) {
            $('#hlp-sorteos').html('<i>No hay sorteos disponibles para este dia.</i>');
            d = [];
        }
        d = d.filter(function (item) {
            return item.sorteo==sorteo.val();
        });
        d.unshift({sorteoID:0,descripcion:"TODOS"});
        sorteos.html(jsrender($('#rd-sorteo-option'), d));
        sorteos.select2('val',0);
        $('#hlp-sorteos').html('');
    }

    if ($elementos) {
        data = $elementos.slice();
        data.unshift({elementoID: 0, descripcion: 'TODAS'});
    } else {
        socket.sendMessage("elementos",null, function (e, d) {
            $elementos = d;
        })
    }

    sfecha.change(function (e) {
        var _fecha = $(e.target).val();
        $('#hlp-sorteos').html('<i class="fa fa-spinner fa-spin"></i> Espere, recibiendo sorteos...</i>');
        socket.sendMessage('sorteos',{fecha:_fecha}, function (e, d) {
            sDia = d || [];
            dsp_sorteos(sDia);
        });
    });

    $('#tope-nuevo').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        data.bancaID = bancas.val();
        var f = formLock(this);
        socket.sendMessage("tope-nuevo",data, function (e,d) {
            formLock(f,false);
            monto.val('');
            socket.sendMessage("topes",{bancaID:bancas.val()}, dsp_topes);
        })
    });
    sfecha.trigger('change');
}
nav.paginas.addListener("bancas/topes",bancasTopes_nav);

function reporteGeneral_nav (p,args) {
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
        socket.sendMessage("reporte-usuario",{s:fdata,g:grp.val()}, function (e, d) {
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
            if (item.cmb>=0) {
                item.balance = item.jugada - item.premio - (item.cmb||item.comision);
            } else {
                item.balance = item.cmb * -1;
            }
            b+=item.balance;
            j+=item.jugada;
            pr+= item.premio;
            pg+= item.pago;
            cm+= item.cmb==0?item.comision:item.cmb;
            rn+= item.renta;
        });

        var total = {
            j: j.format(0), pr: pr.format(0), b:(b-rn).format(0),cm:cm.format(0), r:rn.format(0)
        };
        $('#bheader').html(jsrender($('#rd-total'),total));

        $('#mnt-jugado').html(j.format(0));
        $('#mnt-premios').html(pr.format(0));
        $('#mnt-pagos').html(pg.format(0));
        $('#mnt-balance').html((b-rn).format(0));

        $('#tg-descuento').html((cm+rn).format(0));
        $('#tg-comision').html(cm.format(0));
        $('#tg-renta').html(rn.format(0));

        var rank, bnc;
        //top jugado
        rank = rpt.slice();
        rank.sort(function (a, b) {
            return b.jugada- a.jugada;
        });
        bnc = rank[0];
        $('#tj-banca').html(bnc.desc);
        $('#tj-jugada').html(bnc.jugada.format(0));
        $('#tj-balance').html(bnc.balance.format(0));

        //top ganancia
        rank = rpt.slice();
        rank.sort(function (a, b) {
            return b.balance- a.balance;
        });
        bnc = rank[0];
        $('#tg-banca').html(bnc.desc);
        $('#tg-jugada').html(bnc.jugada.format(0));
        $('#tg-balance').html(bnc.balance.format(0));

        if (premios.val()==0) $('#reporte-body').html(jsrender($('#rd-reporte'),rpt));
        else $('#reporte-body').html(jsrender($('#rd-reporte2'),rpt));

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

    if (args && args.length>0) {
        var a = args[0].split("-");
        var b = args[1].split("-");
        f1.datepicker('setDate',new Date(a[0],parseInt(a[1])-1,a[2]));
        f2.datepicker('setDate',new Date(b[0],parseInt(b[1])-1,b[2]));
        reporte.trigger("submit");
    }
}
nav.paginas.addListener("reporte/general",reporteGeneral_nav);

function reporteTaquilla_nav (p,args) {
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

            $('#mnt-jugado').html(j.format(0));
            $('#mnt-premios').html(pr.format(0));
            $('#mnt-pagos').html(pg.format(0));
            $('#mnt-balance').html((j-pr-cm).format(0));


            $('#tg-descuento').html((cm).format(0));
            $('#tg-comision').html(cm.format(0));

            var rank, bnc;
            //top jugado
            rank = d.slice();
            rank.sort(function (a, b) {
                return b.jugada- a.jugada;
            });
            bnc = rank[0];
            $('#tj-banca').html(bnc.descripcion);
            $('#tj-jugada').html(bnc.jugada.format(0));
            $('#tj-balance').html(bnc.balance.format(0));

            //top ganancia
            rank = d.slice();
            rank.sort(function (a, b) {
                return b.balance- a.balance;
            });
            bnc = rank[0];
            $('#tg-banca').html(bnc.descripcion);
            $('#tg-jugada').html(bnc.jugada.format(0));
            $('#tg-balance').html(bnc.balance.format(0));

            updateView();
        })
    });
    premios.change(updateView);

    function updateView () {
        $('#reporte-body').html(jsrender($('#rd-reporte'),rpt));
    }

    if (args && args.length>0) {
        var a = args[0].split("-");
        var b = args[1].split("-");
        f1.datepicker('setDate',new Date(a[0],parseInt(a[1])-1,a[2]));
        f2.datepicker('setDate',new Date(b[0],parseInt(b[1])-1,b[2]));
    }
}
nav.paginas.addListener("reporte/taquilla",reporteTaquilla_nav);

function reporteGrupo_nav (p,args) {
    var bancas = $('#bancas');
    bancas.html(jsrender($('#rd-banca-option'),$bancas));

    var f1 = $('#reporte-fecha1');
    var f2 = $('#reporte-fecha2');
    var reporte = $('#reporte');
    var grp = $('#rp-agrupar');
    var rpt; var hlp = {bn:function () { return $usuario.nombre;  }};
    $('#reporte').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var f = formLock(this);
        $('#pheader').html(jsrender($('#rd-prtaq'),data,hlp));
        socket.sendMessage("reporte-banca",{s:data,g:grp.val()}, function (e, d) {
            formLock(f,false);
            rpt = d || [];
            updateView();
        })
    });

    function updateView () {
        if (rpt.length==0) return;
        var j=0, pr=0, pg=0, cm= 0, cmb = 0, rn= 0, b=0;
        rpt.forEach(function (item) {
            item.balance = item.jugada-item.premio;

            b+=item.balance;
            j+=item.jugada;
            pr+=item.premio;
            pg+= item.pago;
            cm+= item.comision;
            rn+= item.renta;
            cmb+= item.cmBanca;
        });
        var rv = cmb<0;
        if (rv) cmb = Math.abs(cmb);

        var total = {
            j: j.format(0), pr: pr.format(0),cm:cm.format(0),cmb:cmb.format(0)
        };

        $('#mnt-jugado').html(j.format(0));
        $('#mnt-premios').html(pr.format(0));
        $('#mnt-pagos').html(pg.format(0));
        if (rv) {
            total.b=(b-cmb-cm).format(0);
            $('#mnt-balance').html((b-cmb-cm).format(0));
            $('#tg-descuento').html((Math.abs(cmb+cm)).format(0));
        } else {
            total.b = (b-(cmb||cm)).format(0);
            $('#mnt-balance').html((b-(cmb||cm)).format(0));
            $('#tg-descuento').html((Math.abs(cmb-cm)).format(0));
        }
        $('#tg-comision').html(cm.format(0));
        $('#tg-comisionBanca').html(cmb.format(0));

        var rank, bnc;
        //top jugado
        rank = rpt.slice();
        rank.sort(function (a, b) {
            return b.jugada- a.jugada;
        });
        bnc = rank[0];
        $('#tj-banca').html(bnc.desc);
        $('#tj-jugada').html(bnc.jugada.format(0));
        $('#tj-balance').html(bnc.balance.format(0));

        //top ganancia
        rank = rpt.slice();
        rank.sort(function (a, b) {
            return b.balance- a.balance;
        });
        bnc = rank[0];
        $('#tg-banca').html(bnc.desc);
        $('#tg-jugada').html(bnc.jugada.format(0));
        $('#tg-balance').html(bnc.balance.format(0));

        $('#bheader').html(jsrender($('#rd-total'),total));

        $('#reporte-body').html(jsrender($('#rd-reporte2'),rpt));
    }

    if (args && args.length>0) {
        var a = args[0].split("-");
        var b = args[1].split("-");
        f1.datepicker('setDate',new Date(a[0],parseInt(a[1])-1,a[2]));
        f2.datepicker('setDate',new Date(b[0],parseInt(b[1])-1,b[2]));
        reporte.trigger("submit");
    }
}
nav.paginas.addListener('reporte/grupo',reporteGrupo_nav);

function reporteVentas_nav (p,args) {
    var bancas = $('#bancas'), hbtaq = $('#hb-taquilla'), taqs = $('#taquillas');

    bancas.html(jsrender($('#rd-banca-option'),$bancas));
    bancas.select2("val",0);
    bancas.on("change", function () {
        hbtaq.html('<i class="fa fa-spinner fa-spin"></i> Espere, recibiendo taquillas..');
        socket.sendMessage("taquillas", {bancaID:bancas.val()}, updateTaquillas);
    });
    socket.sendMessage("taquillas", {bancaID:bancas.val()}, updateTaquillas);
    function updateTaquillas (e,d) {
        hbtaq.html('');
        taqs.html(jsrender($('#rd-taquilla-option'),d));
    }

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
            formLock(f,false);
            if (!d.last) socket.addListener('reporte-ventas',prefetch);
            all = all.concat(d.data);
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

        $('#mnt-jugado').html(j.format(0));
        $('#mnt-premios').html(pr.format(0));
        $('#mnt-pagos').html(pg.format(0));
        $('#mnt-balance').html((j-pr).format(0));

        $('#mnt-pendiente').html((pr-pg).format(0));
        $('#mnt-ppagos').html(((pg/pr)*100).format(0));
        $('#mnt-tanulados').html(an.format(0));
        $('#mnt-anulados').html(anm.format(0));
    }

    $('#print-reporte').click(function () {
        var now = new Date();

        var _lineas = [
            {type:"linea",text:$usuario.nombre,align:"center"},
            {type:"linea",text:now.format('yy-mm-dd')+" "+now.format('TZ:240 h:MM:s TT'),align:"center"},
            {type:"linea",text:"REPORTE TICKETS",align:"center"}
        ];

        _lineas.push({type:"linea",text:"JUGADO: "+j.format(0),align:"left"});
        _lineas.push({type:"linea",text:"PREMIOS: "+pr.format(0),align:"left"});
        _lineas.push({type:"linea",text:"PAGOS: "+pg.format(0),align:"left"});
        _lineas.push({type:"linea",text:"PENDIENTE: "+(pr-pg).format(0),align:"left"});
        _lineas.push({type:"linea",text:"BALANCE: "+(j-pg).format(0),align:"left"});
        _lineas.push({type:"linea",text:" ",align:"left"});

        print.sendMessage("print",{data:_lineas,printer:1});
    });

    if (args && args.length==1) {
        var a = args[0].split("-");
        rf.datepicker('setDate',new Date(a[0],parseInt(a[1])-1,a[2]));
        $('#reporte').trigger("submit");
    }
}
nav.paginas.addListener('reporte/ventas',reporteVentas_nav);

function sms_nav (p,args) {
    socket.sendMessage("sms-bandeja",null, function (e, d) {
        d = d || [];
        $('#sms-bandeja').html(jsrender($('#rd-sms'),d));

        //Check
        $('.ckbox input').click(function(){
            var t = jQuery(this);
            if(t.is(':checked')){
                t.closest('tr').addClass('selected');
            } else {
                t.closest('tr').removeClass('selected');
            }
        });

        // Star
        $('.star').click(function(){
            if(!jQuery(this).hasClass('star-checked')) {
                jQuery(this).addClass('star-checked');
            }
            else
                jQuery(this).removeClass('star-checked');
            return false;
        });

        // Read mail
        $('.table-email .media').click(function(){
            var ruta = $(this).attr("ruta");
            location.href="#sms/m|"+ruta;
        });
    })
}
nav.paginas.addListener('mensajes',sms_nav);

function smsNuevo_nav (p,args) {
    $('#wys').html('<textarea id="wysiwyg" placeholder="Tu mensaje aqui..." class="form-control" rows="20" name="contenido"></textarea>');
    //jQuery('#wysiwyg').wysihtml5();

    var send = $('#sms-send');
    var destino = $('#destino');
    destino.html(jsrender($('#rd-banca-option'),$bancas));

    $('#sms-form').submit(function (e) {
        e.preventDefault(e);

        var data = formControls(this);
        data.hilo = 0;
        socket.sendMessage('sms-nuevo',data, function (e, d) {
            console.log(e,d);
        })
    })
}
nav.paginas.addListener('mensaje/nuevo',smsNuevo_nav);

function smsLeer_nav (p,args) {
    if (args && args.length>0) {
        var sms;
        var rutaID = args[0];
        socket.sendMessage("sms-leer",{rutaID:rutaID}, function (e, d) {
            sms = d;
            $('#read-sms').html(jsrender($('#rd-sms-body'),sms));
            jQuery('#wysiwyg').wysihtml5({color: true});

            socket.sendMessage("sms-respuestas",{hilo:sms.smsID}, function (e,d) {
                $('#sms-respuestas').html(jsrender($('#rd-sms-respuesta'),d || []));
            })
        });

        $('#sms-form').submit(function (e) {
            e.preventDefault(e);
            var data = formControls(this);
            data.hilo = sms.smsID;
            data.titulo = "RE: "+sms.titulo;
            data.destino = [sms.destino];
            socket.sendMessage('sms-nuevo',data, function (e, d) {
                console.log(e,d);
            })
        });
        nav.paginas.addListener(Navegador.EXIT, function (e, p) {
            nav.pagins.removeEventListener(e,arguments.callee);
            console.log(e,p);
        })
    }
}
nav.paginas.addListener('mensaje/m',smsLeer_nav);

function conexiones_nav (p,args) {
    var tb = $('#con-table');
    setTimeout(updateView,3000);
    $('#con-off').click(function () {
        var ok = confirm('Esta funcion desconectara y desactivara todas las taquillas registradas');
        if (ok) socket.sendMessage("taquilla-panic",null, updateView);
    });
    $('#con-view').click(updateView);

    function updateView () {
        tb.html('<tr><td colspan="2"><i class="fa fa-spinner fa-spin"></i> Espere, cargando...</td></tr>');
        socket.sendMessage('conexiones',null, function (e, d) {
            tb.html(jsrender($('#rd-conexiones'),d));
        });
    }
}
nav.paginas.addListener('conexiones',conexiones_nav);