// ===============================
// CREAR.JS - Crear / editar búsqueda
// ===============================

let editId = null;
let fuentesGlobal = [];
let fuentesVisibles = [];
let tipoActivo = "";

// Acá se guardan los códigos marcados.
// Así no se pierden cuando filtrás (antes se borraban).
const seleccion = new Set();

async function initCrear() {
  const params = new URLSearchParams(window.location.search);
  editId = params.get("edit");

  try {
    fuentesGlobal = await obtenerFuentes();
  } catch (e) {
    aviso("No se pudo leer data/fuentes.json", "error");
    return;
  }

  if (editId !== null) {
    const busqueda = leerBusquedas()[editId];
    if (busqueda) {
      document.getElementById("nombreBusqueda").value = busqueda.nombre.trim();
      // Solo cargamos códigos que existen en el JSON
      busqueda.fuentes
        .filter(c => fuentesGlobal.some(f => f.codigo === c))
        .forEach(c => seleccion.add(c));
      ponerSimilitud("similitud", leerSimilitud(busqueda, "similitud"));
      ponerSimilitud("similitudInversa", leerSimilitud(busqueda, "similitudInversa"));
      document.getElementById("tituloPagina").textContent = "Editar búsqueda";
      document.getElementById("navCrear").classList.remove("activo");
      document.title = "Editar búsqueda · Listas de Informados";
    } else {
      editId = null;
    }
  }

  if (editId === null) {
    ponerSimilitud("similitud", SIMILITUD_DEFECTO);
    ponerSimilitud("similitudInversa", SIMILITUD_DEFECTO);
  }
  conectarSimilitud("similitud");
  conectarSimilitud("similitudInversa");

  cargarPaises();
  cargarTipos();

  // Un solo "escuchador" para todos los checkboxes
  document.getElementById("listaFuentes").addEventListener("change", e => {
    if (e.target.type !== "checkbox") return;
    if (e.target.checked) seleccion.add(e.target.value);
    else seleccion.delete(e.target.value);
    e.target.closest(".fuente").classList.toggle("marcada", e.target.checked);
    actualizarEstado();
  });

  filtrarFuentes();
}

// ---------- Similitud: la barrita y el número se mueven juntos ----------
function ponerSimilitud(id, valor) {
  document.getElementById(id).value = valor;
  document.getElementById(id + "Rango").value = valor;
}

function conectarSimilitud(id) {
  const numero = document.getElementById(id);
  const rango = document.getElementById(id + "Rango");
  rango.addEventListener("input", () => numero.value = rango.value);
  numero.addEventListener("input", () => {
    if (numero.value !== "") rango.value = Math.min(100, Math.max(0, numero.value));
  });
  // Al salir del campo, lo dejamos dentro de 0 a 100
  numero.addEventListener("blur", () => ponerSimilitud(id, leerSimilitud({ v: numero.value }, "v")));
}

function valorSimilitud(id) {
  const txt = document.getElementById(id).value.trim();
  const n = Number(txt);
  return txt !== "" && Number.isInteger(n) && n >= 0 && n <= 100 ? n : null;
}

function cargarPaises() {
  const paises = [...new Set(fuentesGlobal.map(f => f.pais))].sort((a, b) => a.localeCompare(b, "es"));
  const select = document.getElementById("filtroPais");
  paises.forEach(p => select.add(new Option(p, p)));
}

// Los tipos salen del JSON, así no falta ninguno (antes faltaban SAN, Lobistas, etc.)
function cargarTipos() {
  const cuenta = contarPorTipo(fuentesGlobal);
  const tipos = Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a]);
  const cont = document.getElementById("filtroTipos");

  cont.innerHTML =
    `<button class="activo" style="--c:var(--tinta)" data-tipo="">Todos</button>` +
    tipos.map(t => `<button style="--c:${colorTipo(t)}" data-tipo="${esc(t)}">${esc(t)} (${cuenta[t]})</button>`).join("");

  cont.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;
    tipoActivo = btn.dataset.tipo;
    cont.querySelectorAll("button").forEach(b => b.classList.toggle("activo", b === btn));
    filtrarFuentes();
  });
}

function renderFuentes(lista) {
  const cont = document.getElementById("listaFuentes");

  if (lista.length === 0) {
    cont.innerHTML = `<div class="vacio" style="border:none"><strong>Sin resultados</strong><p>Probá con otro texto o sacá algún filtro.</p></div>`;
    return;
  }

  cont.innerHTML = lista.map(f => {
    const marcada = seleccion.has(f.codigo);
    return `
      <label class="fuente ${marcada ? "marcada" : ""}" style="--c:${colorTipo(f.tipo)}">
        <span class="barrita"></span>
        <input type="checkbox" value="${esc(f.codigo)}" ${marcada ? "checked" : ""}>
        <span>
          <span class="fuente-titulo">${esc(f.titulo)}</span>
          <span class="fuente-meta"><span>${esc(f.pais)}</span><span class="codigo">${esc(f.codigo)}</span></span>
        </span>
        ${chipTipo(f.tipo)}
      </label>`;
  }).join("");
}

function filtrarFuentes() {
  const texto = document.getElementById("filtroTexto").value.toLowerCase().trim();
  const pais = document.getElementById("filtroPais").value;
  const vista = document.getElementById("filtroVista").value;

  fuentesVisibles = fuentesGlobal.filter(f =>
    (!texto || f.titulo.toLowerCase().includes(texto) || f.codigo.toLowerCase().includes(texto)) &&
    (!tipoActivo || f.tipo === tipoActivo) &&
    (!pais || f.pais === pais) &&
    (vista !== "marcadas" || seleccion.has(f.codigo))
  );

  renderFuentes(fuentesVisibles);
  document.getElementById("infoResultados").textContent =
    `Mostrando ${fuentesVisibles.length} de ${fuentesGlobal.length} fuentes`;
  actualizarEstado();
}

function marcarVisibles(marcar) {
  fuentesVisibles.forEach(f => marcar ? seleccion.add(f.codigo) : seleccion.delete(f.codigo));
  filtrarFuentes();
}

function actualizarEstado() {
  const n = seleccion.size;
  document.getElementById("estadoSeleccion").innerHTML =
    n === 0 ? "Ninguna fuente marcada" : `<b>${n}</b> ${n === 1 ? "fuente marcada" : "fuentes marcadas"}`;
}

function guardarBusqueda() {
  const inputNombre = document.getElementById("nombreBusqueda");
  const nombre = inputNombre.value.trim();

  if (!nombre) {
    aviso("Poné un nombre a la búsqueda", "error");
    inputNombre.focus();
    return;
  }
  if (seleccion.size === 0) {
    aviso("Marcá al menos una fuente", "error");
    return;
  }

  const similitud = valorSimilitud("similitud");
  const similitudInversa = valorSimilitud("similitudInversa");
  if (similitud === null || similitudInversa === null) {
    aviso("La similitud tiene que ser un número entero de 0 a 100", "error");
    return;
  }

  // Guardamos en el mismo orden que el JSON
  const codigos = fuentesGlobal.map(f => f.codigo).filter(c => seleccion.has(c));
  const data = leerBusquedas();
  const busqueda = { nombre, fuentes: codigos, similitud, similitudInversa };

  if (editId !== null) data[editId] = busqueda;
  else data.push(busqueda);

  guardarBusquedas(data);
  window.location.href = "index.html";
}

initCrear();
