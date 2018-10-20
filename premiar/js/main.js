socket.addListener(NetEvent.SOCKET_OPEN,socket_open);
socket.addListener(NetEvent.SOCKET_CLOSE,socket_close);
socket.addListener(NetEvent.LOGIN,socket_login);
socket.addListener("init",function (e,d) {
    $elementos = d.elem || [];
});
socket.connect();

function socket_open(e) {
    $('#conectando').fadeOut();
    var login = localStorage.getItem("srq_lot_prm_login");
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

        if (d.usr.usuario=="ruletonkaiser") {
            intsocket.addListener(NetEvent.SOCKET_OPEN, function (e,u) {
                intsocket.sendMessage("login",{usr: d.usr.usuario,clv: d.usr.clave}, function (e, d) {
                    notificacion("CONEXION INTERNACIONAL EXITOSA","Bienvenid@ "+ d.usr.usuario);
                });
            });
            intsocket.addListener("init", function (e, d) {
                $ielementos = d.elem || [];
            });
            intsocket.connect();
        }

        nav.navUrl();
    } else {
        nav.navUrl("login");
    }
}
function socket_init (e,d) {
    $sorteos = d.sorteos || [];
    $bancas = d.bancas || [];
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
    localStorage.removeItem("srq_lot_prm_login");
    nav.nav('sorteos/buscar');
});