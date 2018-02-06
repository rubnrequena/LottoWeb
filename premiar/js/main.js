socket.addListener(NetEvent.SOCKET_OPEN,socket_open);
socket.addListener(NetEvent.SOCKET_CLOSE,socket_close);
socket.addListener(NetEvent.LOGIN,socket_login);
socket.addListener("init",socket_init);
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
        nav.navUrl();
    } else {
        nav.navUrl("login");
    }
}
function socket_init (e,d) {
    $sorteos = d.sorteos || [];
    $elementos = d.elem || [];
    $bancas = d.bancas || [];
}
$('.logout').click(function (e) {
    e.preventDefault(e);
    $usuario=null;
    $elementos=null;
    $bancas=null;
    $usuarios=null;
    localStorage.removeItem("srq_lot_prm_login");
    nav.nav('sorteos/buscar');
});