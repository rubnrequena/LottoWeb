socket.addListener(NetEvent.SOCKET_OPEN,socket_open);
socket.addListener(NetEvent.SOCKET_CLOSE,socket_close);
socket.addListener(NetEvent.LOGIN,socket_login);
socket.addListener("init",onInit);
socket.connect();

function socket_open(e) {
    $('#conectando').fadeOut();
    var login = localStorage.getItem("srq_lot_srv_login");
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
    if (d.code==1) {
        $usuario = d.usr;
        $('.main-usrname').html(d.usr.usuario);
    } else {
        nav.navUrl("login");
    }
}
function onInit (e,d) {
    $elementos = d.elem || [];
    $bancas = d.bancas || [];
    $sorteos = d.sorteos || [];
    nav.navUrl();
}

var hlp = {
    formatDate:dateFormat,
    formatNumber:formatNumber,
    padding:padding
};
$('#vnt-pagar').submit(function (e) {
    e.preventDefault(e);
    var data = formControls(this);
    var f = formLock(this);
    socket.sendMessage("ticket",data, function (e, d) {
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
    $elementos=null;
    $bancas=null;
    $usuarios=null;
    $storage.removeItem("srq_lot_srv_login");
    nav.nav('login');
});