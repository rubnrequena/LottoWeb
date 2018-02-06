/*
 Version 17.02.06
 */
socket.addListener(NetEvent.SOCKET_OPEN,socket_open);
socket.addListener(NetEvent.SOCKET_CLOSE,socket_close);
socket.addListener(NetEvent.LOGIN,socket_login);
socket.addListener("init",initialize);
socket.connect();

$('#logolink').click(reload);

function socket_open(e) {
    $('#conectando').fadeOut();
    var login = storage.getItem("loto_bnlogin");
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
        $usuario = d.usr;
        $bancas = [d.usr];
        $meta = d.meta;
		$('.mn-usuario').html($usuario.usuario);
    }
}
function initialize (e,d) {
    $elementos = d.e;
    $sorteos = d.s;
    nav.navUrl();
}
//ANULAR
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
        } else {
            $('#md-anularTicket').modal('hide');
            notificacion('TICKET ANULADO','TICKET #'+d,'growl-success');
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
    socket.sendMessage("venta-premios",data, function (e, d) {
        formReset(f);
        if (d.hasOwnProperty("code")) {
            notificacion("TICKET NO EXISTE",'');
        } else {
            $('#md-pagar-tpremio').html(jsrender($('#rd-premio-ticket'), [d.tk]));
            $('#md-pagar-prms').html(jsrender($('#rd-premio-premios'), d.prm, hlp));
        }
    })
});
$('#md-ticket').on('hidden.bs.modal', function (e) {
    $('#md-pagar-ticket').val('');
    $('#md-pagar-tpremio').html('');
    $('#md-pagar-prms').html('');
});
$('.logout').click(function (e) {
    e.preventDefault(e);
    $usuario=null;
    $taquillas=null;
    storage.removeItem("loto_bnlogin");
    nav.nav('inicio');
});