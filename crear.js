let editId = null;
let fuentesGlobal = [];

async function initCrear() {
  const params = new URLSearchParams(window.location.search);
  editId = params.get("edit");

  const res = await fetch("data/fuentes.json");
  fuentesGlobal = await res.json();

  cargarPaises();
  renderFuentes(fuentesGlobal);

  if (editId !== null) {
    const data = JSON.parse(localStorage.getItem("busquedas"));
    const busqueda = data[editId];

    document.getElementById("nombreBusqueda").value = busqueda.nombre;

    renderFuentes(fuentesGlobal, busqueda.fuentes);
  }
}

function cargarPaises() {
  const paises = [...new Set(fuentesGlobal.map(f => f.pais))].sort();
  const select = document.getElementById("filtroPais");

  paises.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    select.appendChild(opt);
  });
}

function renderFuentes(lista, seleccionadas = []) {
  const cont = document.getElementById("listaFuentes");

  cont.innerHTML = lista.map(f => `
    <div class="card">
      <label>
        <input type="checkbox" value="${f.codigo}"
          ${seleccionadas.includes(f.codigo) ? "checked" : ""}>
        <div class="card-title">${f.titulo}</div>
        <div class="card-sub">${f.pais} — ${f.tipo}</div>
      </label>
    </div>
  `).join("");
}

function filtrarFuentes() {
  const texto = document.getElementById("filtroTexto").value.toLowerCase();
  const tipo = document.getElementById("filtroTipo").value;
  const pais = document.getElementById("filtroPais").value;

  let filtradas = fuentesGlobal;

  if (texto) filtradas = filtradas.filter(f => f.titulo.toLowerCase().includes(texto));
  if (tipo) filtradas = filtradas.filter(f => f.tipo === tipo);
  if (pais) filtradas = filtradas.filter(f => f.pais === pais);

  renderFuentes(filtradas);
}

function guardarBusqueda() {
  const nombre = document.getElementById("nombreBusqueda").value;
  const checks = [...document.querySelectorAll("#listaFuentes input:checked")];
  const codigos = checks.map(c => c.value);

  const data = JSON.parse(localStorage.getItem("busquedas")) || [];

  if (editId !== null) {
    data[editId] = { nombre, fuentes: codigos };
  } else {
    data.push({ nombre, fuentes: codigos });
  }

  localStorage.setItem("busquedas", JSON.stringify(data));
  window.location.href = "index.html";
}

initCrear();
