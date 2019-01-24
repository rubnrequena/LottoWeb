/**
 * Created by Ruben Requena on 15/06/2016.
 */

// SOCKET
var host = $.cookie("servidor") || location.hostname+":4020";
var socket = new Net("ws://"+host,false);
var intsocket = new Net("ws://104.129.171.162:4040",false);
//var intsocket = new Net("ws://"+host,false);

//NAVEGADOR
var nav = new Navegador();
nav.root = "sorteos/buscar";
nav.folder = "paginas";
nav.viewport = ".contentpanel";
nav.validate = function (page,params) {
    if ($usuario) {
        if ($usuario.nivel == 2) {
            page = page == "sorteos/premiar" || page == "sorteos/buscar" ? page : "404";
        }
        return page;
    } else return "login";
};

// SISTEMA
var $usuario;
var $elementos = [];
var $bancas;
var $usuarios;
var $sorteos;