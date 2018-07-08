function soloActivas (a) {
    return a.activa&& a.papelera==0;
}
/*
Version 17.02.09
*/
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
    select2w($('.s2'));

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
        var f = formLock(f);
        socket.sendMessage("login",data,function (e,d) {
            formLock(f,false);
            var recordar = $('#recordar').is(":checked");
            if (recordar) storage.setItem("loto_bnlogin",JSON.stringify(data));
            else storage.removeItem("loto_bnlogin");
        });
    });
}

nav.paginas.addListener("inicio",inicio_nav);
function inicio_nav(p,arg) {
    var rdia;
    var hlp = copyTo(_helpers);
    hlp.ganador = function (n) {
        var e = findBy("id",n,$elementos);
        return e? "#"+ e.n+" "+e.d : '';
    };

    nav.paginas.addListener(Navegador.EXIT, function (e,p) {
       nav.paginas.removeListener(Navegador.EXIT,arguments.callee);
       if (p=="inicio") activo = false;
    });

    $('#btnload').click(function () {
        $("#inicio-sorteodia").html(jsrender($('#rd-pnlsorteo'),null));
        var col=false;
        $('#prm-col').click(function (e) {
            col = !col;
            $(this).find("a").html(col?"PREMIOS</br>PAGADOS":"PREMIOS</br>A PAGAR");
            if (col) $('#srt_dia').html(jsrender($('#rd-sorteos-dia1-row'), rdia, hlp));
            else $('#srt_dia').html(jsrender($('#rd-sorteos-dia2-row'), rdia, hlp));
        });

        if ($elementos) solicitarReporte();
        else {
            socket.sendMessage("elementos",null, function (e, d) {
                $elementos = d;
                solicitarReporte();
            });
        }
        function solicitarReporte() {
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
    $('#ord-num-gb').click(function (e) {
        e.preventDefault(e);
        $('.order-num').removeClass('btn btn-primary btn-sm');
        $(this).addClass('btn btn-primary btn-sm');
        data.n.sort(function (a,b) {
            return b.glb- a.glb;
        });
        $("#numeros-body").html(jsrender($('#rd-vtnum-row'), data.n));
    });

    $('#sfecha').on("change", function (e) {
        listarSorteos(e.target.value);
    });
    $('#monitor-form').submit(function (e) {
        e.preventDefault(e);
        $("#ventas-body").html('');
        $("#numeros-body").html('');
        var dataForm = formControls(this);
        var f = formLock(this);
        clear();
        socket.sendMessage("monitor",dataForm, function (e, d) {
            formLock(f,false);
            data = d || [];
            var now = new Date();
            $("#ultact").html(now.format('dd/mm/yy hh:MM:ss TT'));
            if (data.t==null) return;

            var jg=0;
            var ld = data.t[0];
            data.t.forEach(function (item) {
                jg+=item.jugada;
                if (item.jugada>ld.jugada) ld = item;
            });

            $("#jugada").html(jg.format(0));
            $("#bnLider").html(ld.banca);
            $("#bnLider-jg").html(ld.jugada.format(0));

            ld = data.n[0];
            data.n.forEach(function (item) {
                item.pcj = item.jugada*100/jg;
                if (item.jugada>ld.jugada) ld = item;
            });
            $("#numLider").html(ld.desc);
            $("#numLider-jg").html(ld.jugada.format(0));

            $("#ventas-body").html(jsrender($('#rd-ventas-row'),data.t));
            $("#numeros-body").html(jsrender($('#rd-vtnum-row'),data.n));
        })

        function clear() {
            $(".clearm").html("--");
            $("#ventas-body").html("");
            $("#numeros-body").html("");
        }
    });

    function listarSorteos (fecha) {
        socket.sendMessage("sorteos",{lista:fecha}, function (e, d) {
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
    var tq_srt;
    var hlp = {
        taq: function (id) {
            if (id>0) {
                var tqq = findBy("taquillaID",id,$taquillas.filter(soloActivas));
                return tqq?tqq.nombre:"<span class='label label-danger'>TAQUILLA NO EXISTE</span>";
            } else return "TODAS"; },
        srt: function (id) {
            return findBy("sorteoID",id,$sorteos)
        }
    };

    if ($taquillas) {
        $('#taquillas').html(jsrender($('#rd-taquilla-option'),$taquillas.filter(soloActivas)));
        listSorteos();
    } else {
        var hbtaq = $('#hb-taquilla');
        hbtaq.html('<i class="fa fa-spinner fa-spin" ></i> Espere, recibiendo taquillas...');
        socket.sendMessage("taquillas", null, function (e, d) {
            $taquillas = d;
            $('#taquillas').html(jsrender($('#rd-taquilla-option'),d));
            hbtaq.remove();
            listSorteos();
        });
    }



    function listSorteos (){
        $('#sorteos').html(jsrender($('#rd-sorteos-option'),$sorteos));
        socket.sendMessage("sorteos_publicos",null, sorteos_publicos);
    }
    $('#reporte').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        data.bancaID = $usuario.bancaID;
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
                socket.sendMessage("sorteos_publicos",null, sorteos_publicos);
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
            socket.sendMessage("pb_editar",{id:taquilla.ID,publico:act}, function (e, d) {
                taquilla.publico = act;
            })
        });

        $('.tqsrt_rem').on("click",remover_publicacion);
    }

    function remover_publicacion (e) {
        var _id = parseInt($(e.target).attr('sid'));
        socket.sendMessage('pb_remover',{id:_id}, function (e, d) {
            var i = findIndex("ID",_id,tq_srt);
            tq_srt.splice(i,1);
            updateView();
        });
    }
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
            if (d.hasOwnProperty("code")) {
                if (d.code==1) {
                    notificacion('SOLICITUD ACEPTADA', 'SORTEO PREMIADO, Gracias por su tiempo...');
                } else if (d.code==0) {
                    notificacion('SOLICITUD ACEPTADA','Gracias por su tiempo...');
                }
                else if (d.code==4) notificacion("SORTEOS","SORTEO #"+data.sorteoID+" YA ESTA PREMIADO",'growl-danger');
                else if (d.code==5) notificacion("SOLICITUD RECHAZADA"," SORTEO #"+data.sorteoID+" SOLICITUD DUPLICADA",'growl-danger');
                else if (d.code==8) notificacion("SOLICITUD RECHAZADA"," SORTEO #"+data.sorteoID+" SORTEO ABIERTO",'growl-danger');
            }
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

function bancasTaquillas_nav(p,args) {

    var papelera = $('#papelera');
    papelera.change(function () {
        updateView();
    });

    var puedeActivar = findBy("campo","taq_activa",$meta).valor;
    var taqActiva = findBy("campo","taq_activa_val",$meta).valor;

    var taqActivar = $('#taq_activar');
    if (puedeActivar==0) {
        taqActivar.prop("disabled",true);
        taqActivar.val(taqActiva);
    }
    var remTaqI = $('#rem-taqinactivas');
    remTaqI.click(function () {
        var i=0;
        var taqs = $taquillas.exploreBy("activa",0).exploreBy("papelera",0);
        if (taqs.length==0) return;
        remTaqI.prop('disabled',1);
        var taq, cont = $('#rem-tqinc');

        var r = confirm('Confirma desea remover todas las taquillas inactivas?');
        if (r===true) removerTaquilla(taqs[i].taquillaID);

        function removerTaquilla (id) {
            cont.html(i+'/'+taqs.length);
            socket.sendMessage('taquilla-remover',{taquillaID:id,papelera:1}, function (e,d) {
                if (d.code==1) {
                    taq = findBy("taquillaID", id, $taquillas);
                    taq.papelera = 1;
                    if (++i<taqs.length) removerTaquilla(taqs[i].taquillaID);
                    else {
                        updateView();
                        cont.html('');
                        remTaqI.prop('disabled',0);
                    }
                }
            });
        }
    });

    function updateView () {
        var _papelera = papelera.prop("checked");
        $taquillas = $taquillas.sort(function (a, b) {
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

        $('#taquillas-body').html(jsrender($('#rd-taquilla-row'),$taquillas.filter(function (a) {
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
                click: puedeActivar==1
            });
        });
        toggles.on("toggle", function (e, act) {
            var id = $(e.target).data('target');
            var taquilla = findBy("taquillaID", id, $taquillas);
            socket.sendMessage("taquilla-activa", {taquillaID: taquilla.taquillaID, activa: act}, function (e, d) {
                if (d.ok) taquilla.activa = act;
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
            var taquilla = findBy("taquillaID", id, $taquillas);
            socket.sendMessage("taquilla-flock", {taquillaID: taquilla.taquillaID, activa: act}, function (e, d) {
                if (d.ok===1) {
                    taquilla.fingerlock = act;
                    if (act==false) {
                        alert('ADVERTENCIA: Al desactivar el sistema de proteccion por huella, SRQ no podra, ni se hara responsable por posibles fraudes por ventas no autorizadas por parte de la agencia.');
                    }
                } else alert("ERROR AL MODIFICAR VALIDACION DE HUELLA")
            })
        });

        //fingerclear
        $('.fingerclear').click(function (e) {
            e.preventDefault(e);
            var b = $(e.currentTarget);
            var id = parseInt(b.attr('val'));
            socket.sendMessage("taquilla-fpclear", {taquillaID:id}, function (e, d) {
                if (d.ok===1) b.parent().html('<i class="fa fa-shield"></i>');
                else alert("ERROR AL MODIFICAR HUELLA DE LA TAQUILLA")
            })
        });

        $('.bn-remove-req').click(function (e) {
            e.preventDefault(e);
            var tID = $(this).attr("taqID");
            var r = confirm('Seguro desea eliminar esta taquilla?');
            if (r===true) {
                socket.sendMessage("taquilla-remover",{taquillaID:tID,papelera:1}, function (e, d) {
                    if (d.code==1) {
                        var taquilla = findBy("taquillaID", tID, $taquillas);
                        taquilla.papelera = 1;
                        updateView();
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
                    var taquilla = findBy("taquillaID", tID, $taquillas);
                    taquilla.papelera = 0;
                    updateView();
                }
            });
            return false;
        });

    }


    if ($taquillas) updateView();
    else {
        socket.sendMessage("taquillas",null, function (e, d) {
            $taquillas = d || [];
            updateView();
        });
    }

    $('#taquilla-nueva').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var f = formLock(this);
        socket.sendMessage("taquilla-nueva",data, function (e, d) {
            if (d.hasOwnProperty("code")) {
                formLock(f,false);
                notificacion("DISCULPE: USUARIO NO DISPONIBLE","El usuario que esta asignando a la taquilla, ya esta en uso intente con uno distinto.","growl-danger");
            } else {
                formReset(f);
                taqActivar.val(taqActiva);
                d.papelera = 0;
                d.fingerlock = true;
                d.fingerprint = null;
                $taquillas.push(d);
                updateView();
            }
        })
    });
}
nav.paginas.addListener("bancas/taquillas",bancasTaquillas_nav);

function bancasTaquilla_nav(p,args) {

    var taquilla;
    var rm = $('#remover');
    if (args && args.length==1) {
        socket.sendMessage("taquilla",{id:args[0]}, function (e, d) {
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
            socket.sendMessage("taquilla-remover",{taquillaID:taquilla.taquillaID}, function (e, d) {
                if ($taquillas && $taquillas.length>0) {
                    var i = findIndex("taquillaID", taquilla.taquillaID, $taquillas);
                    $taquillas[i].papelera = 1;
                }
                nav.back();
            })
        });
    }
}
nav.paginas.addListener("bancas/taquilla",bancasTaquilla_nav);

function bancasTopes_nav (p,args) {
    var topeGrupo = findBy("campo","tope_grp",$meta).valor;
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
        },
        eliminar: function (compartido) {
            if (compartido==0) return true;
            else if (compartido==2) return false;
            else {
                return topeGrupo;
            }
        }
    };
    var data;
    var taqs = $('#taquilla'), sorteos = $('#sorteos'), sorteo = $('#sorteo'), elemento = $('#elemento'), monto = $('#monto');
    var sDia;

    function onTopes (e, d) {
        dsp_topes(e,d);
        socket.sendMessage("taquillas",null, function (e, d) {
            d = d || [];
            d = d.filter(soloActivas);
            d.unshift({taquillaID:0,nombre:"TODAS"});

            taqs.html(jsrender($('#rd-taquilla-option'), d));
            taqs.select2('val',0);

            var lsorteos = $sorteos.slice();
            lsorteos.unshift({sorteoID:0,nombre:"TODOS"});
            sorteo.html(jsrender($('#rd-sorteos-option'),lsorteos));
            sorteo.on("change", function () {
                var v = sorteo.val();
                var elem = exploreBy("s",v,$elementos);
                elem.unshift({id:0,d:"TODOS"});
                elemento.html(jsrender($('#rd-elemento-option'),elem));
                elemento.select2('val',0);

                dsp_sorteos(sDia);
            });
            sorteo.trigger("change");

            sfecha.trigger('change');
        });

        function soloActivas (a) {
            return a.activa&& a.papelera==0;
        }
    }
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

    var sfecha = $('#sorteo-fecha');
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
        var f = formLock(this);
        socket.sendMessage("tope-nuevo",data, function (e,d) {
            formLock(f,false);
            monto.val('');
            socket.sendMessage("topes",null, dsp_topes);
        })
    });

    if ($elementos) {
        data = $elementos.slice();
        data.unshift({elementoID: 0, descripcion: 'TODAS'});
        socket.sendMessage("topes",null, onTopes);
    } else {
        socket.sendMessage("elementos",null, function (e, d) {
            $elementos = d;
            socket.sendMessage("topes",null, onTopes);
        })
    }

    var tcomp = [{val:0,desc:"NO"}];
    var tcompe = $('#tp-compartido');
    if (topeGrupo) tcomp.push({val:1,desc:"SI"});
    else tcompe.prop('disabled','disabled');
    tcompe.html(jsrender($('#rd-topes-comp'),tcomp));

}
nav.paginas.addListener("bancas/topes",bancasTopes_nav);

function reporteGeneral_nav (p,args) {
    var f1 = $('#reporte-fecha1');
    var f2 = $('#reporte-fecha2');
    var reporte = $('#reporte');
    var premios = $('#prm-select'), grp = $('#rp-agrupar');
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
    premios.change(updateView);

    function updateView () {
        $('.clr-val').html('--');
        $('#reporte-body').html('');

        if (rpt.length==0) return;
        var j=0, pr=0, pg=0, cm=0, cmb= 0, rn= 0, b= 0, rv=false;
        rpt.forEach(function (item) {
            item.balance = item.jugada-(premios.val()==0?item.pago:item.premio);

            b+=item.balance;
            j+=item.jugada;
            pr+=item.premio;
            pg+= item.pago;
            cm+= item.comision;
            rn+= item.renta;
            cmb+= item.cmBanca;
        });
        rv = cmb<0;
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
        $('#tg-renta').html(cmb.format(0));

        $('#bheader').html(jsrender($('#rd-total'),total));

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

        if ($taquillas) sobreNombres();
        else {
            var hlp = $('#reporte-hlp');
            hlp.html("<i class='fa fa-spinner fa-spin'></i> Espere, recibiendo lista de taquillas");
            socket.sendMessage('taquillas',null, function (e,d) {
                hlp.remove();
                $taquillas = d;
                sobreNombres();
            })
        }
    }
    function sobreNombres() {
        $('.banca-celda').each(function (index) {
            var me = $(this);
            if ($.isNumeric(me.html())) {
                var n = parseInt(me.html());
                var taq = findBy("taquillaID",n,$taquillas);
                me.html(taq.nombre);
            }
        })
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
    var premios = $('#prm-select');
    var rpt;
    var hlp = {taq: function (id) {
        return findBy("taquillaID",id,$taquillas).nombre;
    }};
    if ($taquillas) {
        $('#taquillas').html(jsrender($('#rd-taquilla-option'),$taquillas.filter(soloActivas)));
    } else {
        var hbtaq = $('#hb-taquilla');
        hbtaq.html('<i class="fa fa-spinner fa-spin" ></i> Espere, recibiendo taquillas...');
        socket.sendMessage("taquillas", null, function (e, d) {
            $taquillas = d;
            $('#taquillas').html(jsrender($('#rd-taquilla-option'),d.filter(soloActivas)));
            hbtaq.remove();
        });
    }

    $('#reporte').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var f = formLock(this);
        $('#pheader').html(jsrender($('#rd-prtaq'),data,hlp));
        socket.sendMessage("reporte-taquilla",data, function (e, d) {
            formLock(f,false);
            rpt = d || [];

            updateView();
            var rank, bnc;
            //top jugado
            rank = rpt.slice();
            rank.sort(function (a, b) {
                return b.jugada- a.jugada;
            });
            bnc = rank[0];
            $('#tj-banca').html(bnc.fecha);
            $('#tj-jugada').html(bnc.jugada.format(0));
            $('#tj-balance').html(bnc.balance.format(0));

            //top ganancia
            rank = d.slice();
            rank.sort(function (a, b) {
                return b.balance- a.balance;
            });
            bnc = rank[0];
            $('#tg-banca').html(bnc.fecha);
            $('#tg-jugada').html(bnc.jugada.format(0));
            $('#tg-balance').html(bnc.balance.format(0));
        })
    });
    premios.change(updateView);

    function updateView () {
        var total;
        if (premios.val()==0) $('#reporte-body').html(jsrender($('#rd-reporte'),rpt));
        else $('#reporte-body').html(jsrender($('#rd-reporte2'),rpt));

        var j=0, pg= 0, pr = 0, cm=0;
        rpt.forEach(function (item) {
            item.balance = item.jugada-item.premio;
            j+=item.jugada;
            pg+=item.pago;
            pr+=item.premio;
            cm+=item.comision;
        });

        $('#mnt-jugado').html(j.format(0));
        $('#mnt-premios').html(pr.format(0));
        $('#mnt-pagos').html(pg.format(0));
        if (premios.val()==0) {
            $('#mnt-balance').html((j-pg-cm).format(0));
            total = {
                j: j.format(0), pr: pr.format(0), b:(j-pg-cm).format(0),cm:cm.format(0)
            };
        }  else {
            $('#mnt-balance').html((j-pr-cm).format(0));
            total = {
                j: j.format(0), pr: pr.format(0), b:(j-pr-cm).format(0),cm:cm.format(0)
            };
        }

        $('#tg-descuento').html((cm).format(0));
        $('#tg-comision').html(cm.format(0));

        $('#bheader').html(jsrender($('#rd-total'),total));
    }

    $('#btn-imprimir').click(function () {
        if (!$('body').hasClass('leftpanel-collapsed')) {
            $('.menutoggle').trigger("click");
        }
        window.print();
    })
}
nav.paginas.addListener("reporte/taquilla",reporteTaquilla_nav);

function reporteSorteo_nav (p,args) {
    var freporte = $('#reporte');
    var help = {
        elm:function (n) {
            var e = findBy("id",n,$elementos);
            return e? "#"+e.n+" "+e.d:n;
        },padding:padding
    };

    var rf = $('#reporte-fecha');
    var hbs = $('#hb-sorteo');
    rf.change(function (e) {
        hbs.html('<i class="fa fa-spinner fa-spin"></i> Espere, cargando listado de sorteos...');
        socket.sendMessage("sorteos",{fecha: e.target.value}, function (e, d) {
            hbs.html('');
            $('#sorteos').html(jsrender($('#rd-sorteo-option'),d));
        })
    });
    rf.trigger("change");

    freporte.submit(function (e) {
        formLock(freporte);
        e.preventDefault(e);
        var data = formControls(this);

        if ($elementos) solicitarReporte();
        else {
            socket.sendMessage("elementos",null, function (e, d) {
                $elementos = d;
                solicitarReporte();
            });
        }

        function solicitarReporte() {
            socket.sendMessage("reporte-sorteo",data, function (e, d) {
                if (!d) {
                    $('#reporte-body').html('');
                    formLock(freporte,false);
                } else {
                    if ($taquillas) {
                        reporte_mostrar(d)
                    } else {
                        socket.sendMessage("taquillas",null, function (e,taqs) {
                            $taquillas = taqs;
                            reporte_mostrar(d);
                        })
                    }
                }
            });
        }
    });

    function reporte_mostrar (d) {
        formLock(freporte,false);
        var j = 0, p = 0;
        //totalizar elementos
        d.e.forEach(sumar);
        d.e.push({
            monto: j,
            premio: p,
            balance: (j - p)
        });
        $('#reporte-body').html(jsrender($('#rd-reporte-elemento'), d.e, help));
        //totalizar taquillas
        j = 0; p = 0;
        d.t.forEach(sumar);
        var tq;
        d.t.forEach(function (item) {
            tq = findBy("taquillaID",item.taquillaID,$taquillas);
            item.taquilla = tq?tq.nombre:"ERROR #404";
        });
        d.t.push({
            monto: j,
            premio: p,
            balance: (j - p)
        });
        $('#taquillas-body').html(jsrender($('#rd-reporte-taquilla'), d.t));

        function sumar (item) {
            j += item.monto;
            p += item.premio;
        }
    }

    if (args && args.length>0) {

    }
}
nav.paginas.addListener('reporte/sorteo',reporteSorteo_nav);

function reporteVentas_nav (p,args) {
    var hlp = {taq: function (id) {
        return findBy("taquillaID",id,$taquillas).nombre;
    }};
    if ($taquillas) {
        $('#taquillas').html(jsrender($('#rd-taquilla-option'),$taquillas.filter(soloActivas)));
    } else {
        var hbtaq = $('#hb-taquilla');
        hbtaq.html('<i class="fa fa-spinner fa-spin" ></i> Espere, recibiendo taquillas...');
        socket.sendMessage("taquillas", null, function (e, d) {
            $taquillas = d;
            $('#taquillas').html(jsrender($('#rd-taquilla-option'),d.filter(soloActivas)));
            hbtaq.remove();
        });
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
            if (!d.last) socket.addListener('reporte-ventas',prefetch);
            all = all.concat(d.data);
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

function reporteDiario_nav (p,args) {
    var f1 = $('#reporte-fecha1');
    var reporte = $('#rp-diario');
    var premios = $('#prm-select'), grp = $('#rp-agrupar');
    var rpt; var hlp = {bn:function () { return $usuario.nombre;  }};
    reporte.submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var f = formLock(this);
        $('#pheader').html(jsrender($('#rd-prtaq'),data,hlp));
        socket.sendMessage("reporte-diario",data, function (e, d) {
            formLock(f,false);
            rpt = d.data || [];
            updateView();
        })
    });
    premios.change(updateView);

    function updateView () {
        if (rpt.length==0) return;
        var j=0, pr=0, pg=0, cm=0, cmb= 0, b= 0;
        rpt.forEach(function (item) {
            item.balance = item.jugado-(premios.val()==0?item.pago:item.premio);

            b+=item.balance;
            j+=item.jugado;
            pr+=item.premio;
            pg+= item.pago;
            cm+= item.comision;
        });

        var total = {
            j: j.format(0), pr: pr.format(0),cm:cm.format(0),cmb:cmb.format(0)
        };
        $('#mnt-jugado').html(j.format(0));
        $('#mnt-premios').html(pr.format(0));
        $('#mnt-pagos').html(pg.format(0));

        $('#mnt-balance').html((b-cm).format(0));
        $('#tg-descuento').html(cm.format(0));

        $('#tg-comision').html(cm.format(0));
        $('#tg-renta').html(cmb.format(0));

        $('#bheader').html(jsrender($('#rd-total'),total));

        var rank, bnc;
        //top jugado
        rank = rpt.slice();
        rank.sort(function (a, b) {
            return b.jugado- a.jugado;
        });
        bnc = rank[0];
        $('#tj-banca').html(bnc.desc);
        $('#tj-jugada').html(bnc.jugado.format(0));
        $('#tj-balance').html(bnc.balance.format(0));

        //top ganancia
        rank = rpt.slice();
        rank.sort(function (a, b) {
            return b.balance- a.balance;
        });
        bnc = rank[0];
        $('#tg-banca').html(bnc.desc);
        $('#tg-jugada').html(bnc.jugado.format(0));
        $('#tg-balance').html(bnc.balance.format(0));

        if (premios.val()==0) $('#reporte-body').html(jsrender($('#rd-reporte'),rpt));
        else $('#reporte-body').html(jsrender($('#rd-reporte2'),rpt));
    }

    if (args && args.length>0) {
        var a = args[0].split("-");
        f1.datepicker('setDate',new Date(a[0],parseInt(a[1])-1,a[2]));
        reporte.trigger("submit");
    }
}
nav.paginas.addListener('reporte/diario',reporteDiario_nav);

function conexiones_nav (p,args) {
    var tb = $('#con-table');
    setTimeout(updateView,3000);
    $('#con-off').click(function () {
        socket.sendMessage("taquilla-panic",null, updateView);
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
nav.paginas.addListener('sms',sms_nav);

function smsNuevo_nav (p,args) {
    select2w($('.s2dest'),{placeholder:"Dejar en blanco para enviar mensaje a su banquero/administrador"});
    $('#wys').html('<textarea id="wysiwyg" placeholder="Tu mensaje aqui..." class="form-control" rows="20" name="contenido"></textarea>');
    jQuery('#wysiwyg').wysihtml5();

    var send = $('#sms-send');
    var destino = $('#destino');

    socket.sendMessage("taquillas-act",{activa:1},function (e,d) {
        d = d || [];
        d.push();
        destino.html(jsrender($('#rd-taquilla-option'),d || []));
    });

    $('#sms-form').submit(function (e) {
        e.preventDefault(e);

        var data = formControls(this);
        data.hilo = 0;
        socket.sendMessage('sms-nuevo',data, function (e, d) {
            console.log(e,d);
        })
    });
}
nav.paginas.addListener('sms/nuevo',smsNuevo_nav);

function smsLeer_nav (p,args) {
    if (args && args.length>0) {
        var sms;
        var rutaID = args[0];
        socket.sendMessage("sms-leer",{rutaID:rutaID}, function (e, d) {
            sms = d;
            $('#read-sms').html(jsrender($('#rd-sms-body'),sms));
            jQuery('#wysiwyg').wysihtml5({color: true});

            socket.sendMessage("sms-respuestas",{hilo:sms.smsID}, function (e,d) {
                $('#sms-respuestas').html(jsrender($('#rd-sms-respuesta'),d||[]));
            });

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
        })
    }
}
nav.paginas.addListener('sms/m',smsLeer_nav);
