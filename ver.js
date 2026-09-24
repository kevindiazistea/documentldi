async function cargarBusqueda() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const busquedas = JSON.parse(localStorage.getItem("busquedas"));
  const busqueda = busquedas[id];

  document.getElementById("tituloBusqueda").innerText = busqueda.nombre;

  const res = await fetch("data/fuentes.json");
  const fuentes = await res.json();

  const seleccionadas = fuentes.filter(f => busqueda.fuentes.includes(f.codigo));

  document.getElementById("fuentesSeleccionadas").innerHTML =
    seleccionadas.map(f => `
      <div class="card">
        <div class="card-title">${f.titulo}</div>
        <div class="card-sub">${f.pais} — ${f.tipo}</div>
      </div>
    `).join("");

  window.busquedaActual = busqueda;
  window.fuentesActuales = seleccionadas;
}

function generarDocumento() {
  const clienteInput = document.getElementById("clienteInput");
  const cliente = clienteInput ? clienteInput.value.trim() : "Sin cliente";

  generarPDF([busquedaActual], window.fuentesActuales, cliente);
}

cargarBusqueda();
