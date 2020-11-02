/**
 * Created by Ruben Requena on 15/06/2016.
 */

// SOCKET
var host = $.cookie("servidor") || location.hostname + ":4020";
var customHost = /host=(?<host>\d*.\d*.\d*.\d*):(?<puerto>\d*)/g.exec(
  window.location.search
);
if (customHost) host = `${customHost.groups.host}:${customHost.groups.puerto}`;
var socket = new Net("ws://" + host, false);

//NAVEGADOR
var nav = new Navegador();
nav.root = "sorteos/buscar";
nav.folder = "paginas";
nav.viewport = ".contentpanel";
nav.validate = function (page, params) {
  if ($usuario) {
    if ($usuario.nivel == 2) {
      var grant = ["sorteos/premiar", "sorteos/buscar", "sorteos/pendientes"];
      page = grant.indexOf(page) > -1 ? page : "404";
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
var $decimales = 0;
