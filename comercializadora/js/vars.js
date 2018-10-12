/**
 * Created by Ruben Requena on 15/06/2016.
 */

// SOCKET
var loc = location.href.split("/")[3];
if (loc=="LotoVictoria") loc = "127.0.0.1:4024";
if (loc=="animales") loc = "104.129.171.16:4004";
else if (loc=="animal") loc = "104.129.171.162:4014";
else if (loc=="animalitos") loc = "104.129.171.162:4024";
else if (location.href.indexOf("ruletonve")>-1) loc = "104.129.171.162:4014";
else if (location.href.indexOf("ruleton")>-1) loc = "104.129.171.162:4044";
var host = $.cookie("comercializadora") || loc;

var socket = new Net("ws://"+host,false);

//NAVEGADOR
var nav = new Navegador();
nav.folder = "paginas";
nav.viewport = ".contentpanel";
nav.validate = function (page,params) {
    return $usuario?page:"login";
};
var storage = localStorage;
// SISTEMA
var $usuario;
var $elementos;
var $bancas = [];
var $taquillas;