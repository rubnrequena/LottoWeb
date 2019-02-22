/**
 * Created by Ruben Requena on 15/06/2016.
 */

// SOCKET
var loc = location.href.split("/")[3];
if (loc=="LotoVictoria") loc = "127.0.0.1:4023";
if (loc=="animales") loc = "104.129.171.16:4003";
else if (loc=="animal") loc = "104.129.171.162:4013";
else if (loc=="animalitos") loc = "104.129.171.162:4023";
var host = $.cookie("usuario") || loc;

var socket = new Net("ws://"+host,false);

//NAVEGADOR
var nav = new Navegador();
nav.folder = "paginas";
nav.viewport = ".contentpanel";
nav.validate = function (page,params) {
    if (page=="suspendido") return page;
    return $usuario?page:"login";
};
var storage = localStorage;
// SISTEMA
var $usuario;
var $elementos;
var $bancas;
var $taquillas;
var $balance;