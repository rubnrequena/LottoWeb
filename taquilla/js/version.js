"use strict";
const versionActual = 201008;
const versionRegistrada = parseFloat(localStorage.getItem("srq.tq.version"));

function parche_201008() {
  localStorage.setItem(CONFIG.SORTEOS_ORDEN, 1);
  localStorage.setItem("srq.tq.version", 201008);
  console.log("aplicando parche 201008");
}

const parches = {
  201008: parche_201008,
};

if (versionRegistrada) {
  if (versionActual > versionRegistrada) {
    verificar_parches(versionActual);
  }
} else verificar_parches(0);

function verificar_parches(version) {
  let reiniciar = false;
  for (const parche in parches) {
    if (parches.hasOwnProperty(parche)) {
      /** @type {Function} */
      const parcheHandler = parches[parche];
      if (parseFloat(parche) > version) {
        parcheHandler.call();
        reiniciar = true;
      }
    }
  }
  if (reiniciar) {
    alert(
      "Se ha recibido un parche de actualizacion ,se aplicara un reinicio para actualizar la configuración."
    );
    location.reload();
  }
}
