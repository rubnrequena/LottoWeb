/**
 * v170511
 */

// SOCKET
var host = $.cookie("banca") || location.hostname + ":4021";
//host = "192.111.37.107:4011";

var customHost = /host=(?<host>\d*.\d*.\d*.\d*):(?<puerto>\d*)/g.exec(
    window.location.search
);
if (customHost) host = `${customHost.groups.host}:${customHost.groups.puerto}`;
var socket = new Net("ws://" + host, false);
var storage = localStorage;
//NAVEGADOR
var nav = new Navegador();
nav.folder = "paginas";
nav.viewport = ".contentpanel";
nav.validate = function (page, params) {
    if ($usuario) {
        var acceso = true;
        if (page == "sorteos/publicar") acceso = findBy("campo", "srt_publicar", $meta).valor == "1";
        if (page == "bancas/taquillas") acceso = findBy("campo", "taq_crear", $meta).valor == "1";
        if (page == "bancas/topes") acceso = findBy("campo", "tps_crear", $meta).valor == "1";
        return acceso ? page : "404";
    } else {
        return "login";
    }
};

// SISTEMA
var $balance;
var $usuario;
var $elementos;
var $bancas;
var $taquillas;
var $meta;