/**
 * Created by Ruben Requena on 27/06/2017.
 */

// SOCKET
var host = $.cookie("servidor") || location.hostname + ":4020";
/* var customHost = /host=(\d*.\d*.\d*.\d*):(\d*)/g.exec(
    window.location.search
);
if (customHost) host = `${customHos[1]}:${customHost[2]}`; */
var socket = new Net("ws://" + host, false);

//NAVEGADOR
var nav = new Navegador();
nav.folder = "paginas";
nav.viewport = ".contentpanel";
nav.validate = function (page, params) {
    return $usuario ? page : "login";
};
var $storage = localStorage;
// SISTEMA
var $usuario;
var $elementos = [];
var $bancas;
var $usuarios;
var $sorteos;

//initConfig
var $config = {
    balance: {
        filtrar: true
    }
};
if ($storage.getItem("srq.operadora")) {
    $config = JSON.parse($storage.getItem("srq.operadora"));
}

function saveConfig() {
    $storage.setItem("srq.operadora", JSON.stringify($config));
}