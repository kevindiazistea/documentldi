// ===============================
// VER.JS - Detalle de una búsqueda
// ===============================

let busquedaActual = null;
let fuentesActuales = [];

async function cargarBusqueda() {
  const id = new URLSearchParams(window.location.search).get("id");
  busquedaActual = leerBusquedas()[id];

  if (!busquedaActual) {
    document.querySelector("main").innerHTML = `
      <div class="vacio">
        <strong>No encontramos esa búsqueda</strong>
        <p>Puede que se haya eliminado.</p>
        <a class="btn" href="index.html">Volver al panel</a>
      </div>`;
    return;
  }

  document.getElementById("tituloBusqueda").textContent = busquedaActual.nombre.trim();
  document.getElementById("btnEditar").href = `crear.html?edit=${id}`;
  document.getElementById("clienteActual").textContent = leerCliente() || "sin cargar";

  const fuentes = await obtenerFuentes();
  fuentesActuales = fuentes.filter(f => busquedaActual.fuentes.includes(f.codigo));

  // Resumen: total + cantidad por tipo
  const cuenta = contarPorTipo(fuentesActuales);
  const paises = new Set(fuentesActuales.map(f => f.pais)).size;

  document.getElementById("resumen").innerHTML = `
    <div class="resumen-item"><b>${fuentesActuales.length}</b><span>fuentes</span></div>
    <div class="resumen-item"><b>${paises}</b><span>${paises === 1 ? "país" : "países"}</span></div>
    <div class="resumen-item"><b>${leerSimilitud(busquedaActual, "similitud")}%</b><span>similitud</span></div>
    <div class="resumen-item"><b>${leerSimilitud(busquedaActual, "similitudInversa")}%</b><span>similitud inversa</span></div>
    ${Object.entries(cuenta).map(([t, n]) =>
      `<div class="resumen-item"><b style="color:${colorTipo(t)}">${n}</b><span>${esc(t)}</span></div>`).join("")}
  `;
  document.getElementById("barraGrande").innerHTML = barraTipos(fuentesActuales);

  document.getElementById("fuentesSeleccionadas").innerHTML = fuentesActuales.map(f => `
    <tr>
      <td><b>${esc(f.titulo)}</b></td>
      <td>${esc(f.pais)}</td>
      <td>${chipTipo(f.tipo)}</td>
      <td class="codigo">${esc(f.codigo)}</td>
    </tr>`).join("");
}

function generarDocumento() {
  // Antes buscaba un input de cliente que en esta página no existe.
  // Ahora usa el cliente cargado en el panel principal.
  const cliente = leerCliente() || "Sin cliente";
  generarPDF([busquedaActual], fuentesActuales, cliente);
  aviso("PDF generado");
}

cargarBusqueda();
