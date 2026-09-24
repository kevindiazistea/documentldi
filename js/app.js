// ===============================
// APP.JS - Panel principal (index.html)
// ===============================

const modelos = {
  estandar: [
    // PEP
    {
      nombre: "Búsqueda PEP",
      fuentes: ["B_PEPS_CI_AR", "CIA_WORLDLEADERS", "EX_FUNC_PEPS_ARM", "B_PEPS_SI_AR"]
    },
    // Terroristas / Sancionados
    {
      nombre: "Búsqueda Terroristas y Sancionados",
      fuentes: ["ONU", "REPET", "OFAC_SDN", "OFAC", "MAS_BUSCADOS_AR", "INHABIL_CAMBIOS",
                "CANADA_SANCTIONS", "REINO_UNIDO", "EUROPOL"]
    },
    // Listas Sensibles
    {
      nombre: "Búsqueda Listas Sensibles",
      fuentes: ["DEA", "FBI", "INTERPOL_MOST_WAN", "UNION_EUROPEA", "NCA_MOST_WANTED", "PUB_SAFETY_CANADA"]
    },
    // Sujetos Obligados Inscriptos
    {
      nombre: "Búsqueda SO Inscriptos",
      fuentes: ["SO_SI_AR"]
    },
    // Sujetos Obligados No Inscriptos / Deshabilitados
    {
      nombre: "Búsqueda SO No Inscriptos / Deshabilitados",
      fuentes: ["SO_NO_AR", "SO_DES_AR"]
    }
  ]
};

let fuentesIndex = [];

// ===============================
// CLIENTE (queda guardado aunque cambies de página)
// ===============================
function obtenerCliente() {
  const input = document.getElementById("clienteInput");
  const valor = input ? input.value.trim() : "";
  return valor || "Sin cliente";
}

function initCliente() {
  const input = document.getElementById("clienteInput");
  input.value = leerCliente();
  input.addEventListener("input", () => guardarCliente(input.value.trim()));
}

// ===============================
// MODELOS
// ===============================
function cargarModelo() {
  const select = document.getElementById("modeloSelect");
  const data = modelos[select.value];
  if (!data) return;

  // Aviso antes de pisar lo que ya había
  if (leerBusquedas().length > 0 &&
      !confirm("Esto reemplaza las búsquedas que tenés ahora por las del modelo. ¿Seguimos?")) {
    select.value = "";
    return;
  }

  // Cada búsqueda del modelo arranca con la similitud por defecto
  guardarBusquedas(data.map(b => ({
    ...b,
    similitud: SIMILITUD_DEFECTO,
    similitudInversa: SIMILITUD_DEFECTO
  })));
  cargarBusquedas();
  seleccionarTodo();
  select.value = "";
  aviso(`Modelo cargado: ${data.length} búsquedas`);
}

// ===============================
// LISTA DE BÚSQUEDAS
// ===============================
function cargarBusquedas() {
  const data = leerBusquedas();
  const cont = document.getElementById("listaBusquedas");
  if (!cont) return;

  if (data.length === 0) {
    cont.innerHTML = `
      <div class="vacio">
        <strong>Todavía no hay búsquedas</strong>
        <p>Cargá el modelo estándar en "Datos del informe" o armá una desde cero.</p>
        <a class="btn" href="crear.html">+ Nueva búsqueda</a>
      </div>`;
    actualizarEstado();
    return;
  }

  cont.innerHTML = data.map((b, i) => {
    const fs = fuentesIndex.filter(f => b.fuentes.includes(f.codigo));
    const tipos = Object.keys(contarPorTipo(fs));

    return `
      <div class="busqueda">
        <div class="lomo">${barraTipos(fs)}</div>
        <input type="checkbox" class="selectBusqueda" value="${i}"
               id="bus-${i}" aria-label="Incluir ${esc(b.nombre)}">
        <label class="busqueda-info" for="bus-${i}" style="margin:0;font-weight:400;cursor:pointer">
          <div class="card-title">${esc(b.nombre.trim())}</div>
          <div class="card-sub">
            ${fs.length} ${fs.length === 1 ? "fuente" : "fuentes"}
            <span class="separador"></span>Similitud ${leerSimilitud(b, "similitud")}%
            <span class="separador"></span>Inversa ${leerSimilitud(b, "similitudInversa")}%
          </div>
          <div class="chips">${tipos.map(chipTipo).join("")}</div>
        </label>
        <div class="busqueda-acciones">
          <a class="btn-texto" href="ver.html?id=${i}">Ver</a>
          <a class="btn-texto" href="crear.html?edit=${i}">Editar</a>
          <button class="btn-texto peligro" onclick="eliminarBusqueda(${i})">Eliminar</button>
        </div>
      </div>`;
  }).join("");

  actualizarEstado();
}

// Cuenta lo marcado y habilita el botón
function actualizarEstado() {
  const checks = [...document.querySelectorAll(".selectBusqueda")];
  const marcadas = checks.filter(c => c.checked);
  const data = leerBusquedas();

  checks.forEach(c => c.closest(".busqueda").classList.toggle("marcada", c.checked));

  const codigos = new Set();
  const existentes = new Set(fuentesIndex.map(f => f.codigo));
  marcadas.forEach(c => data[c.value].fuentes
    .filter(cod => existentes.has(cod))
    .forEach(cod => codigos.add(cod)));

  const estado = document.getElementById("estadoSeleccion");
  const btn = document.getElementById("btnGenerar");

  if (marcadas.length === 0) {
    estado.textContent = "Ninguna búsqueda marcada";
  } else {
    estado.innerHTML = `<b>${marcadas.length}</b> ${marcadas.length === 1 ? "búsqueda" : "búsquedas"}
      con <b>${codigos.size}</b> fuentes distintas`;
  }
  btn.disabled = marcadas.length === 0;
}

// ===============================
// SELECCIONAR / DESELECCIONAR TODO
// ===============================
function seleccionarTodo() {
  document.querySelectorAll(".selectBusqueda").forEach(c => c.checked = true);
  actualizarEstado();
}

function deseleccionarTodo() {
  document.querySelectorAll(".selectBusqueda").forEach(c => c.checked = false);
  actualizarEstado();
}

// ===============================
// ELIMINAR BÚSQUEDA
// ===============================
function eliminarBusqueda(id) {
  const data = leerBusquedas();
  if (!confirm(`¿Eliminar "${data[id].nombre.trim()}"?`)) return;
  data.splice(id, 1);
  guardarBusquedas(data);
  cargarBusquedas();
  aviso("Búsqueda eliminada");
}

// ===============================
// GENERAR DOCUMENTO MÚLTIPLE
// ===============================
async function generarDocumentoMultiple() {
  const checks = [...document.querySelectorAll(".selectBusqueda:checked")];
  if (checks.length === 0) {
    aviso("Marcá al menos una búsqueda", "error");
    return;
  }

  const data = leerBusquedas();
  const seleccionadas = checks.map(c => data[parseInt(c.value)]);

  try {
    const fuentes = await obtenerFuentes();
    generarPDF(seleccionadas, fuentes, obtenerCliente());
    aviso("Informe generado");
  } catch (e) {
    console.error(e);
    aviso("No se pudo generar el informe. Revisá la consola.", "error");
  }
}

// ===============================
// INICIALIZAR INDEX
// ===============================
async function initIndex() {
  initCliente();

  // Cualquier cambio en un checkbox actualiza la barra de abajo
  document.getElementById("listaBusquedas")
    .addEventListener("change", e => {
      if (e.target.classList.contains("selectBusqueda")) actualizarEstado();
    });

  try {
    fuentesIndex = await obtenerFuentes();
  } catch (e) {
    aviso("No se pudo leer data/fuentes.json", "error");
  }
  cargarBusquedas();
}

initIndex();
