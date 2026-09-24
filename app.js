function obtenerCliente() {
  const input = document.getElementById("clienteInput");
  return input ? input.value.trim() : "Sin cliente";
}

const modelos = {
  estandar: [

    // PEP
    {
      nombre: "Búsqueda PEP",
      fuentes: [
        "B_PEPS_CI_AR",
        "CIA_WORLDLEADERS",
        "EX_FUNC_PEPS_ARM",
        "B_PEPS_SI_AR"
      ]
    },

    // Terroristas / Sancionados
    {
      nombre: "Búsqueda Terroristas y Sancionados",
      fuentes: [
        "ONU",
        "REPET",
        "OFAC_SDN",
        "OFAC",
        "MAS_BUSCADOS_AR",
        "INHABIL_CAMBIOS",
        "CANADA_SANCTIONS",
        "REINO_UNIDO",
        "EUROPOL"
      ]
    },

    // Listas Sensibles
    {
      nombre: "Búsqueda Listas Sensibles",
      fuentes: [
        "DEA",
        "FBI",
        "INTERPOL_MOST_WAN",
        "UNION_EUROPEA",
        "NCA_MOST_WANTED",
        "PUB_SAFETY_CANADA"
      ]
    },

    // Sujetos Obligados Inscriptos
    {
      nombre: " Búsqueda SO Inscriptos",
      fuentes: [
        "SO_SI_AR"
      ]
    },

    // Sujetos Obligados No Inscriptos / Deshabilitados
    {
      nombre: "Búsqueda SO No Inscriptos / Deshabilitados",
      fuentes: [
        "SO_NO_AR",
        "SO_DES_AR"
      ]
    }
  ]
};

function cargarModelo() {
  const modelo = document.getElementById("modeloSelect").value;

  if (!modelo) return;

  const data = modelos[modelo];
  if (!data) return;

  // Guardamos las búsquedas prearmadas
  localStorage.setItem("busquedas", JSON.stringify(data));

  // Recargamos la lista
  cargarBusquedas();

  // Marcar todas automáticamente
  setTimeout(() => seleccionarTodo(), 100);
}

async function cargarBusquedas() {
  const data = JSON.parse(localStorage.getItem("busquedas")) || [];
  const cont = document.getElementById("listaBusquedas");

  if (!cont) return; // evita romper otras páginas

  cont.innerHTML = data.map((b, i) => `
    <div class="card">

      <input type="checkbox" class="selectBusqueda" value="${i}" />

      <div class="card-title">${b.nombre}</div>
      <div class="card-sub">${b.fuentes.length} fuentes seleccionadas</div>

      <a class="btn" href="ver.html?id=${i}">Ver</a>
      <a class="btn" href="crear.html?edit=${i}">Editar</a>
      <a class="btn btn-danger" onclick="eliminarBusqueda(${i})">Eliminar</a>

    </div>
  `).join("");
}

// ===============================
// SELECCIONAR TODO
// ===============================
function seleccionarTodo() {
  const checks = document.querySelectorAll(".selectBusqueda");
  checks.forEach(c => c.checked = true);
}

// ===============================
// DESELECCIONAR TODO
// ===============================
function deseleccionarTodo() {
  const checks = document.querySelectorAll(".selectBusqueda");
  checks.forEach(c => c.checked = false);
}

// ===============================
// ELIMINAR BÚSQUEDA
// ===============================
function eliminarBusqueda(id) {
  const data = JSON.parse(localStorage.getItem("busquedas")) || [];
  data.splice(id, 1);
  localStorage.setItem("busquedas", JSON.stringify(data));
  cargarBusquedas();
}

// ===============================
// GENERAR DOCUMENTO MÚLTIPLE
// ===============================
async function generarDocumentoMultiple() {
  const checks = [...document.querySelectorAll(".selectBusqueda:checked")];

  if (checks.length === 0) {
    alert("Seleccioná al menos una búsqueda");
    return;
  }

  const ids = checks.map(c => parseInt(c.value));
  const data = JSON.parse(localStorage.getItem("busquedas"));

  const res = await fetch("data/fuentes.json");
  const fuentes = await res.json();

  const búsquedasSeleccionadas = ids.map(id => data[id]);

  const cliente = obtenerCliente();

  generarPDF(búsquedasSeleccionadas, fuentes, cliente);
}

// ===============================
// INICIALIZAR INDEX
// ===============================
cargarBusquedas();
