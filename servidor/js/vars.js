/**
 * Created by Ruben Requena on 27/06/2017.
 */

// SOCKET
var host = $.cookie("servidor") || location.hostname+":4020";
//host = "192.111.37.10:4000";
var socket = new Net("ws://"+host,false);

//NAVEGADOR
var nav = new Navegador();
nav.folder = "paginas";
nav.viewport = ".contentpanel";
nav.validate = function (page,params) {
    return $usuario?page:"login";
};

// SISTEMA
var $usuario;
var $elementos;
var $bancas;
var $usuarios;