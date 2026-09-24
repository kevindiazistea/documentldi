// ===============================
// COMUN.JS - cosas que usan todas las páginas
// ===============================

// Color de cada tipo de lista (se usa en etiquetas y barritas)
const COLORES_TIPO = {
  "PEP":                 "#3B4BA8",
  "Terrorismo":          "#B3261E",
  "Sancionado":          "#C2570C",
  "SAN":                 "#C2570C",
  "Judiciales":          "#6B3FA0",
  "Noticias":            "#5B6770",
  "Sujeto Obligado":     "#0F7A5C",
  "Funcionario Público": "#2D6FA3",
  "Lobistas":            "#8A6D00",
  "Benef. Final. Chile": "#00707A"
};

function colorTipo(tipo) {
  return COLORES_TIPO[tipo] || "#5B6770";
}

// Evita que un texto con < o > rompa el HTML
function esc(txt) {
  return String(txt ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

// Etiqueta de color para un tipo
function chipTipo(tipo) {
  return `<span class="chip" style="--c:${colorTipo(tipo)}">${esc(tipo)}</span>`;
}

// ---------- Datos ----------
let _fuentesCache = null;

async function obtenerFuentes() {
  if (_fuentesCache) return _fuentesCache;
  const res = await fetch("data/fuentes.json");
  if (!res.ok) throw new Error("No se pudo leer data/fuentes.json");
  _fuentesCache = await res.json();
  return _fuentesCache;
}

function leerBusquedas() {
  try {
    return JSON.parse(localStorage.getItem("busquedas")) || [];
  } catch {
    return [];
  }
}

function guardarBusquedas(data) {
  localStorage.setItem("busquedas", JSON.stringify(data));
}

function leerCliente() {
  return localStorage.getItem("cliente") || "";
}

function guardarCliente(nombre) {
  localStorage.setItem("cliente", nombre);
}

// ---------- Avisos (reemplazan al alert) ----------
function aviso(mensaje, tipo = "ok") {
  let zona = document.getElementById("zonaAvisos");
  if (!zona) {
    zona = document.createElement("div");
    zona.id = "zonaAvisos";
    zona.setAttribute("aria-live", "polite");
    document.body.appendChild(zona);
  }
  const el = document.createElement("div");
  el.className = `aviso aviso-${tipo}`;
  el.textContent = mensaje;
  zona.appendChild(el);
  setTimeout(() => el.classList.add("saliendo"), 3200);
  setTimeout(() => el.remove(), 3600);
}

// Resumen de tipos de una lista de fuentes: { PEP: 3, Terrorismo: 2, ... }
function contarPorTipo(fuentes) {
  const cuenta = {};
  fuentes.forEach(f => cuenta[f.tipo] = (cuenta[f.tipo] || 0) + 1);
  return cuenta;
}

// Barra de colores proporcional a los tipos (el "lomo" de cada búsqueda)
function barraTipos(fuentes) {
  const total = fuentes.length || 1;
  const cuenta = contarPorTipo(fuentes);
  return Object.entries(cuenta)
    .map(([tipo, n]) =>
      `<span style="flex:${n};background:${colorTipo(tipo)}" title="${esc(tipo)}: ${n}"></span>`)
    .join("") || `<span style="flex:1;background:var(--linea)"></span>`;
}

// ---------- Similitud ----------
// Valor por defecto para búsquedas viejas que todavía no lo tienen guardado
const SIMILITUD_DEFECTO = 90;

// Devuelve un número de 0 a 100 (campo: "similitud" o "similitudInversa")
function leerSimilitud(busqueda, campo) {
  const v = Number(busqueda?.[campo]);
  return Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : SIMILITUD_DEFECTO;
}
