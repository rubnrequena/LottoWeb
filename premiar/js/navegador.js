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
            if (recordar) localStorage.setItem("srq_lot_prm_login",JSON.stringify(data));
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
    socket.sendMessage("inicio", null, function (e,d) {
        if (d.hasOwnProperty("code")) {

        } else $('#srt_dia').html(jsrender($('#rd-sorteos-dia-row'), d.data, hlp));
        $('#str-dia-stamp').html((new Date(d.time).format('hh:MM TT')))
    })
}

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

            select2w($('.s3'),{allowClear:true,placeholder: {
                id: '-1', // the value of the option
                text: 'Select an option'
            }});
            $('select.sorteosel').each(function (idx,item) {
                var s = $(item).data('select');
                $(item).select2('val',s);
                $(item).val(s);
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
                notificacion('[JV] SOLICITUD ACEPTADA', 'SORTEO #' + data.sorteoID + " PREMIADO<p>GANADOR: #" + el.numero +" "+ el.descripcion +"</p>");
            }
            else if (d.code==4) notificacion("SORTEOS","SORTEO #"+data.sorteoID+" YA ESTA PREMIADO",'growl-danger');
            else if (d.code==3) notificacion("SORTEOS","SORTEO #"+data.sorteoID+" PREMIADO, PERO SIN VENTAS REGISTRADAS",'growl-danger');
            else if (d.code==5) notificacion("SOLICITUD RECHAZADA"," SORTEO #"+data.sorteoID+" SOLICITUD DUPLICADA",'growl-danger');
        })
    });
    $('#reiniciar-form').submit(function (e) {
        e.preventDefault(e);
        var c = confirm("Seguro desea reiniciar premio?");
        if (c==1) {
            var data = formControls(this);
            var f = formLock(this);
            socket.sendMessage("sorteo-reiniciar", data, function (e, d) {
                formLock(f, false);
                notificacion("SORTEOS", "SORTEO #" + data.sorteoID + " REINICIADO SATISFACTORIAMENTE");
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
        socket.sendMessage("reporte-sorteo-global",{d:data,a:grp}, function (e, d) {
            formLock(f,false);
            if (!d) {
                $('#reporte-body').html('');
                $('.clr').html('--');
                return;
            }
            rdata = d;
            var j=0, pr=0, pg=0, cm=0, rn=0;
            d.forEach(function (item) {
                item.balance = item.jugada-item.premio-item.comision;
                j+=item.jugada;
                pr+=item.premio;
                cm+= item.comision;
            });

            $('#mnt-jugado').html(j.format(0));
            $('#mnt-premios').html(pr.format(0));
            $('#mnt-comision').html(cm.format(0));
            $('#mnt-balance').html((j-pr-cm).format(0));

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

function sorteosUsuarios_nav (p,args) {
    var usuarios;
    socket.sendMessage("sorteos-usuarios",null, update);

    function update (e,d) {
        usuarios = d;
        $('#ubody').html(jsrender($('#usuario-row'),d));
        $('.usuario-rem').click(function (e) {
            var id = $(this).data('id');
            socket.sendMessage("sorteo-usuario",{sid:id}, function (e, d) {
                if (d.code==1) {
                    notificacion('USUARIO REMOVIDO CON EXITO');
                    var idx = findIndex("sID",id,usuarios);
                    if (idx>-1) {
                        usuarios.splice(idx, 1);
                        update('sorteos-usuarios',usuarios);
                    }
                } else notificacion('ERROR AL REMOVER USUARIO',null,'text-growl-danger');
            });
        })
    }

    $('#reg-usuario').submit(function (e) {
        e.preventDefault(e);
        var data = formControls(this);
        var f = formLock(this);
        socket.sendMessage('sorteo-usuario',data, function (e, d) {
            formReset(f);
            if (d.code==1) socket.sendMessage("sorteos-usuarios",null, update);
            else notificacion("ERROR AL REGISTRAR USUARIO","Usuario no existe");
        })
    });
}
nav.paginas.addListener("sorteos/usuarios",sorteosUsuarios_nav);