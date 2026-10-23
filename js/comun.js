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

// ---------- Perfil del consultor (manual por ahora) ----------
function leerPerfil() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem("perfil")) || {}; } catch {}
  // Si venía de la versión anterior, aprovechamos el nombre guardado
  if (!p.nombre && localStorage.getItem("remitente")) p.nombre = localStorage.getItem("remitente");
  return {
    nombre: p.nombre || "",
    puesto: p.puesto || "Consultor",
    area: p.area || "",
    email: p.email || ""
  };
}

function guardarPerfil(p) {
  localStorage.setItem("perfil", JSON.stringify(p));
  document.dispatchEvent(new CustomEvent("perfil-cambiado"));
}

function iniciales(nombre) {
  const partes = (nombre || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

// ---------- Cliente y tenant en curso ----------
function leerTenant() {
  return localStorage.getItem("tenant") || "";
}

function guardarClienteTenant(cliente, tenant) {
  guardarCliente(cliente);
  localStorage.setItem("tenant", tenant);
  document.dispatchEvent(new CustomEvent("cliente-cambiado"));
}

const TENANT_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// "Banco Ejemplo" -> "bancoejemplo"
function sugerirTenant(txt) {
  return (txt || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "").replace(/^-+|-+$/g, "");
}

function estadoTenant(t = leerTenant()) {
  t = (t || "").trim();
  if (!t) return { ok: false, vacio: true };
  if (TENANT_VALIDO.test(t)) return { ok: true, valor: t };
  return { ok: false, sugerencia: sugerirTenant(t) };
}

// ---------- Copiar al portapapeles ----------
async function copiarTexto(texto, mensaje = "Copiado") {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    // Plan B para navegadores viejos o páginas sin https
    const ta = document.createElement("textarea");
    ta.value = texto;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  aviso(mensaje);
}

// ---------- Módulos (data/modulos.json) ----------
let _modulosCache = null;

async function obtenerModulos() {
  if (_modulosCache) return _modulosCache;
  const res = await fetch("data/modulos.json");
  if (!res.ok) throw new Error("No se pudo leer data/modulos.json");
  _modulosCache = await res.json();
  return _modulosCache;
}
