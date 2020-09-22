/**
 * Created by Ruben Requena on 15/06/2016.
 */

// SOCKET
var host = $.cookie("comercializadora") || "127.0.0.1:4024";
var customHost = /host=(?<host>\d*.\d*.\d*.\d*):(?<puerto>\d*)/g.exec(
  window.location.search
);
if (customHost) host = `${customHost.groups.host}:${customHost.groups.puerto}`;
var socket = new Net("ws://" + host, false);
//NAVEGADOR
var nav = new Navegador();
nav.folder = "paginas";
nav.viewport = ".contentpanel";
nav.validate = function (page, params) {
  if (page == "suspendido") {
    nav.viewport = "body";
    return "suspendido";
  }
  return $usuario ? page : "login";
};
var storage = localStorage;
// SISTEMA
var $balance;
var $usuario;
var $elementos;
var $bancas = [];
var $taquillas;

var $mensajes = [];

var $ielementos;

//initConfig
var $config = {
  balance: {
    filtrar: true,
  },
};
if (storage.getItem("srq.operadora")) {
  $config = JSON.parse(storage.getItem("srq.operadora"));
}

function saveConfig() {
  storage.setItem("srq.operadora", JSON.stringify($config));
}
