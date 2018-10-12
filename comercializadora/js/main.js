socket.addListener(NetEvent.SOCKET_OPEN,socket_open);
socket.addListener(NetEvent.SOCKET_CLOSE,socket_close);
socket.addListener(NetEvent.LOGIN,socket_login);
socket.addListener(NetEvent.MESSAGE,socket_message);
socket.connect();

function socket_message () {
    //console.log("bytes",socket.bytesIn,socket.bytesOut,socket.bytesIn+socket.bytesOut);
}
function socket_open(e) {
    $('#conectando').fadeOut();
    var login = storage.getItem("loto_cmlogin");
    if (login) {
        socket.sendMessage("login",JSON.parse(login));
    } else {
        nav.navUrl();
    }
}
function socket_close(e) {
    $('#conectando').fadeIn();
    setTimeout(reload,1000);
}
function reload () {
    location.reload(false);
}
function socket_login(e,d) {
    if (d.hasOwnProperty("code")) {
        if (d.code==2) notificacion("DATOS INVALIDOS","Verifique los datos introducidos y vuelva a intentar.","growl-danger");
        else notificacion("INICIO DE SESION FALLIDO","Razon desconocida, consulte con su administrador.","growl-danger");
    } else {
        $usuario = d.us;
        $bancas = d.bn;
        $elementos = d.el;
        $sorteos = d.st;
		$('.mn-usuario').html($usuario.usuario);

        socket.sendMessage('balance-padre',null, function (e, d) {
            $usuario.balance = d;
            if ($usuario.balance) {
                $('#menu-balance-date').html(d[0].fecha);
                $('#menu-balance-value').html('<i class="fa fa-dollar"></i> '+d[0].balance.format(2));
            }
            nav.navUrl();
        });
    }
}
$('.logout').click(function (e) {
    e.preventDefault(e);
    $usuario=null;
    $bancas=null;
    $elementos = null;
    $sorteos = null;
    storage.removeItem("loto_cmlogin");
    nav.nav('inicio');
});

//UI
//ANULAR
socket.addListener("venta-anular-banca", function (e,d) {
    notificacion('TICKET ANULADO POR BANCA','TICKET #'+d,'growl-success',true);
});
$('#vnt-anular').submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    var f = formLock(this);
    socket.sendMessage("venta-anular",data, function (e, d) {
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
    var bancas = $('#md-anular-bancas');
    bancas.html(jsrender($('#rd-banca-option'),$bancas));
    //bancas.select2("val",0);

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
    socket.sendMessage("venta-premios",data, function (e, d) {
        formLock(f,false);
        if (d.hasOwnProperty("code")) {
            notificacion("TICKET NO EXISTE",'');
        } else {
            $('#md-pagar-tpremio').html(jsrender($('#rd-premio-ticket'), [d.tk]));
            $('#md-pagar-prms').html(jsrender($('#rd-premio-premios'), d.prm, hlp));
            $('.pagar-premio').click(function (e) {
                var btn = $(e.target);
                var venta = btn.data('id');
                var ticket = btn.data('ticket');
                var codigo = $('#md-pagar-codigo').val();
                btn.prop("disabled", true);
                socket.sendMessage('venta-pagar', {id: venta, tk: ticket, cod:codigo}, function (e, d) {
                    if (d.hasOwnProperty("code")) {
                        notificacion("#"+ticket+": PAGO NO PROCESADO","CODIGO INVALIDO o TICKET EXPIRO","growl-danger");
                        btn.prop("disabled", false);
                    } else btn.html('<i class="fa fa-check"></i>');
                })
            });
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
select2w($('#md-anular-bancas'));
//END UI