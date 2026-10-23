// ===============================
// ENDPOINTS.JS - Armado de endpoints y mail
// ===============================

// ---------- PLANTILLA DEL MAIL (editá acá los textos generales) ----------
// Variables: {nombre}, {cliente}
// Lo propio de cada módulo (textos, endpoints, body) está en data/modulos.json
const PLANTILLA_MAIL = {
  asunto: "Endpoints de integración – {cliente}",
  saludo: "Hola, ¿cómo están?",
  presentacion: "Mi nombre es {nombre} y formo parte del equipo de Worldsys.",
  introUno:    "Les comparto la información de integración del módulo contratado por {cliente}:",
  introVarios: "Les comparto la información de integración de los módulos contratados por {cliente}:",
  cierre: "Ante cualquier duda o consulta, quedo a disposición.",
  firma: ["Saludos,", "{nombre}", "Worldsys"]
};

let modulos = [];
let modo = "endpoints";
const marcados = new Set();

// Marcas para lo que falta completar (se pintan en rojo en la vista previa)
const FALTA_INI = "\u0001", FALTA_FIN = "\u0002";
const falta = (etiqueta) => FALTA_INI + etiqueta + FALTA_FIN;
const reFalta = /\u0001(.*?)\u0002/g;

// Texto -> HTML con lo faltante resaltado
const aHtml = (s) => esc(s).replace(reFalta, '<mark class="falta">[$1]</mark>');
// Texto -> texto plano
const aTexto = (s) => s.replace(reFalta, "[$1]");
// ¿Le falta algo a este texto?
const tieneFalta = (s) => String(s).includes(FALTA_INI);

// ===============================
// INICIO
// ===============================
async function initEndpoints() {
  try {
    const res = await fetch("data/modulos.json");
    if (!res.ok) throw new Error();
    modulos = await res.json();
  } catch {
    aviso("No se pudo leer data/modulos.json", "error");
    return;
  }

  modulos.filter(m => m.porDefecto).forEach(m => marcados.add(m.id));

  conectarCampo("clienteInput", "cliente");
  conectarCampo("tenantInput", "tenant");
  conectarCampo("nombreInput", "remitente");

  document.querySelectorAll(".segmentado button").forEach(b =>
    b.addEventListener("click", () => cambiarModo(b.dataset.modo)));

  document.getElementById("listaModulos").addEventListener("change", e => {
    if (e.target.type !== "checkbox") return;
    e.target.checked ? marcados.add(e.target.value) : marcados.delete(e.target.value);
    e.target.closest(".modulo").classList.toggle("marcada", e.target.checked);
    renderCamposModulos();
    actualizar();
  });

  renderModulos();
  renderCamposModulos();
  cambiarModo(localStorage.getItem("modoEndpoints") === "mail" ? "mail" : "endpoints");
}

function conectarCampo(id, clave) {
  const input = document.getElementById(id);
  input.value = localStorage.getItem(clave) || "";
  input.addEventListener("input", () => {
    localStorage.setItem(clave, input.value.trim());
    actualizar();
  });
}

function valor(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function modulosMarcados() {
  return modulos.filter(m => marcados.has(m.id));
}

// ===============================
// MODO
// ===============================
function cambiarModo(nuevo) {
  modo = nuevo;
  localStorage.setItem("modoEndpoints", modo);
  const conMail = modo === "mail";

  document.querySelectorAll(".segmentado button").forEach(b =>
    b.setAttribute("aria-checked", b.dataset.modo === modo));

  document.getElementById("bloqueNombre").hidden = !conMail;
  document.getElementById("bloqueMail").hidden = !conMail;
  document.getElementById("accionesEndpoints").style.display = conMail ? "none" : "contents";
  document.getElementById("accionesMail").style.display = conMail ? "contents" : "none";
  renderCamposModulos();
  actualizar();
}

// ===============================
// TENANT
// ===============================
const TENANT_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function sugerirTenant(txt) {
  return txt.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "").replace(/^-+|-+$/g, "");
}

function estadoTenant() {
  const t = valor("tenantInput");
  if (!t) return { ok: false, vacio: true };
  if (TENANT_VALIDO.test(t)) return { ok: true, valor: t };
  return { ok: false, sugerencia: sugerirTenant(t) };
}

function usaTenant(m) {
  return JSON.stringify(m).includes("{tenant}");
}

// ===============================
// VARIABLES PROPIAS DE CADA MÓDULO (ej: código de Vault)
// ===============================
const idCampo = (m, v) => `var-${m.id}-${v.id}`;
const claveVar = (m, v) => `var:${m.id}.${v.id}`;

// Solo se completan para el mail, así que se muestran en ese modo
function renderCamposModulos() {
  const cont = document.getElementById("camposModulos");

  // Guardamos lo escrito antes de redibujar
  const previos = {};
  cont.querySelectorAll("[data-var]").forEach(el => previos[el.id] = el.value);

  if (modo !== "mail") { cont.innerHTML = ""; return; }

  cont.innerHTML = modulosMarcados()
    .filter(m => m.variables?.length)
    .map(m => m.variables.map(v => {
      const id = idCampo(m, v);
      const guardado = v.recordar ? localStorage.getItem(claveVar(m, v)) : null;
      const inicial = previos[id] ?? guardado ?? (v.tipo === "lista" ? (v.defecto || []).join("\n") : (v.defecto || ""));
      const campo = v.tipo === "lista"
        ? `<textarea id="${id}" class="input" rows="3" data-var>${esc(inicial)}</textarea>
           <p class="ayuda">Uno por línea.</p>`
        : `<input id="${id}" class="input" data-var value="${esc(inicial)}" placeholder="${esc(v.placeholder || "")}" autocomplete="off" spellcheck="false">`;
      return `<label for="${id}">${esc(v.etiqueta)}</label>${campo}`;
    }).join("")).join("");

  // Al escribir: actualiza y, si corresponde, lo recuerda
  modulosMarcados().forEach(m => (m.variables || []).forEach(v => {
    const el = document.getElementById(idCampo(m, v));
    if (!el) return;
    el.addEventListener("input", () => {
      if (v.recordar) localStorage.setItem(claveVar(m, v), el.value);
      actualizar();
    });
  }));
}

function valorVariable(m, v) {
  const crudo = document.getElementById(idCampo(m, v))?.value ?? "";
  if (v.tipo === "lista") return crudo.split("\n").map(s => s.trim()).filter(Boolean);
  return crudo.trim();
}

// Reemplaza {tenant}, {vault}, etc. Si falta algo, deja una marca.
function completarModulo(txt, m) {
  return txt.replace(/\{(\w+)\}/g, (todo, id) => {
    if (id === "tenant") {
      const t = estadoTenant();
      return t.ok ? t.valor : falta("tenant");
    }
    const v = (m.variables || []).find(x => x.id === id);
    if (!v) return todo;
    const val = valorVariable(m, v);
    if (Array.isArray(val)) return val.length ? val.join(", ") : falta(v.etiqueta);
    return val || falta(v.etiqueta);
  });
}

// Si la línea es solo una variable de tipo lista, devuelve sus ítems
function lineaLista(linea, m) {
  const r = linea.match(/^\{(\w+)\}$/);
  const v = r && (m.variables || []).find(x => x.id === r[1] && x.tipo === "lista");
  if (!v) return null;
  const items = valorVariable(m, v);
  return items.length ? items : [falta(v.etiqueta)];
}

// ===============================
// RENDER: módulos y endpoints
// ===============================
function renderModulos() {
  document.getElementById("listaModulos").innerHTML = modulos.map(m => {
    const marcado = marcados.has(m.id);
    const cant = m.endpoints.length;
    return `
      <label class="modulo ${marcado ? "marcada" : ""}">
        <input type="checkbox" value="${esc(m.id)}" ${marcado ? "checked" : ""}>
        <span>
          <span class="card-title">${esc(m.nombre)}</span>
          <span class="card-sub">
            ${cant} ${cant === 1 ? "endpoint" : "endpoints"}<span class="separador"></span>${usaTenant(m) ? "Cambia según el tenant" : "Fijo"}
          </span>
        </span>
      </label>`;
  }).join("");
}

// URL con el tenant resaltado (para la pantalla)
function urlHtml(url) {
  const t = estadoTenant();
  return url.split("{tenant}").map(esc).join(
    t.ok ? `<mark>${esc(t.valor)}</mark>` : `<mark class="falta">{tenant}</mark>`);
}
const urlTexto = (url, m) => aTexto(completarModulo(url, m));
const bodyTexto = (body) => JSON.stringify(body, null, 2);
const atributo = (s) => JSON.stringify(s).replace(/"/g, "&quot;");

function actualizar() {
  if (!modulos.length) return;

  const seleccion = modulosMarcados();
  const necesitaTenant = seleccion.some(usaTenant);
  const t = estadoTenant();

  // Ayuda del tenant
  const ayuda = document.getElementById("tenantAyuda");
  const inputTenant = document.getElementById("tenantInput");
  if (!t.ok && !t.vacio) {
    ayuda.innerHTML = t.sugerencia
      ? `Formato inválido. ¿Quisiste decir <button class="link-sugerencia" type="button">${esc(t.sugerencia)}</button>?`
      : "Formato inválido. Solo minúsculas, números y guiones.";
    ayuda.classList.add("error");
    inputTenant.classList.add("input-error");
    const btn = ayuda.querySelector(".link-sugerencia");
    if (btn) btn.onclick = () => {
      inputTenant.value = t.sugerencia;
      localStorage.setItem("tenant", t.sugerencia);
      actualizar();
    };
  } else {
    ayuda.textContent = necesitaTenant || t.ok
      ? "Solo minúsculas, números y guiones."
      : "Los módulos marcados no usan tenant.";
    ayuda.classList.remove("error");
    inputTenant.classList.remove("input-error");
  }

  // Lista de endpoints
  const cont = document.getElementById("listaEndpoints");
  if (seleccion.length === 0) {
    cont.innerHTML = `<div class="vacio"><strong>Ningún módulo marcado</strong><p>Marcá al menos un módulo para ver sus endpoints.</p></div>`;
  } else {
    cont.innerHTML = seleccion.map(m => `
      <div class="grupo-endpoints">
        <div class="grupo-titulo">${esc(m.nombre)}</div>
        ${(m.documentacion || []).map(d => `
          <div class="endpoint">
            <span class="endpoint-nombre">${esc(d.nombre)}</span>
            <code class="endpoint-url">${urlHtml(d.url)}</code>
            <button class="btn-texto" onclick="copiarTexto(${atributo(urlTexto(d.url, m))}, 'Link copiado')">Copiar</button>
          </div>`).join("")}
        ${m.endpoints.map(e => `
          <div class="endpoint">
            <span class="endpoint-nombre">${esc(e.nombre)}</span>
            <span class="endpoint-linea">
              ${e.metodo ? `<span class="metodo">${esc(e.metodo)}</span>` : ""}
              <code class="endpoint-url">${urlHtml(e.url)}</code>
            </span>
            <button class="btn-texto" onclick="copiarTexto(${atributo(urlTexto(e.url, m))}, 'Endpoint copiado')">Copiar</button>
            ${e.body ? `
              <pre class="endpoint-body">${esc(bodyTexto(e.body))}</pre>
              <button class="btn-texto" onclick="copiarTexto(${atributo(bodyTexto(e.body))}, 'Body copiado')">Copiar body</button>` : ""}
          </div>`).join("")}
      </div>`).join("");
  }

  const totalEnd = seleccion.reduce((n, m) => n + m.endpoints.length, 0);
  document.getElementById("estadoEndpoints").innerHTML = seleccion.length
    ? `<b>${seleccion.length}</b> ${seleccion.length === 1 ? "módulo" : "módulos"}, <b>${totalEnd}</b> ${totalEnd === 1 ? "endpoint" : "endpoints"}`
    : "Ningún módulo marcado";

  if (modo === "mail") renderMail();
}

// ===============================
// MAIL
// ===============================
// Se arma como una lista de "bloques" y de ahí sale el texto plano y el HTML
function bloquesMail() {
  const datos = {
    nombre: valor("nombreInput") || falta("tu nombre"),
    cliente: valor("clienteInput") || falta("cliente")
  };
  const g = (txt) => txt.replace(/\{nombre\}/g, datos.nombre).replace(/\{cliente\}/g, datos.cliente);
  const P = PLANTILLA_MAIL;
  const seleccion = modulosMarcados();
  const B = [];

  B.push({ tipo: "p", texto: P.saludo });
  B.push({ tipo: "p", texto: g(P.presentacion) + " " + g(seleccion.length === 1 ? P.introUno : P.introVarios) });

  seleccion.forEach(m => {
    B.push({ tipo: "titulo", texto: m.nombre });
    (m.intro || []).forEach(l => B.push({ tipo: "p", texto: completarModulo(l, m) }));

    if (m.documentacion?.length) {
      B.push({ tipo: "lista", items: m.documentacion.map(d => ({
        texto: d.nombre, url: completarModulo(d.url, m)
      })) });
    }
    if (m.introEndpoints) B.push({ tipo: "p", texto: completarModulo(m.introEndpoints, m) });

    m.endpoints.forEach((e, i) => {
      if (m.numerar) B.push({ tipo: "subtitulo", texto: `${i + 1}. ${e.nombre}` });
      if (e.texto) B.push({ tipo: "p", texto: completarModulo(e.texto, m), pegado: true });
      B.push({ tipo: "url", metodo: e.metodo, url: completarModulo(e.url, m), pegado: !!e.body || !!e.nota });
      if (e.body) B.push({ tipo: "codigo", texto: bodyTexto(e.body) });
      if (e.nota) B.push({ tipo: "p", texto: completarModulo(e.nota, m) });
    });

    (m.cierre || []).forEach(l => {
      const items = lineaLista(l, m);
      if (items) B.push({ tipo: "lista", items: items.map(t => ({ texto: t })) });
      else B.push({ tipo: "p", texto: completarModulo(l, m) });
    });
  });

  B.push({ tipo: "p", texto: P.cierre });
  B.push({ tipo: "firma", lineas: P.firma.map(g) });

  return { asunto: g(P.asunto), bloques: B };
}

function mailTexto(B) {
  const out = [];
  B.forEach(b => {
    switch (b.tipo) {
      case "titulo":    out.push(b.texto.toUpperCase(), ""); break;
      case "subtitulo": out.push(b.texto); break;
      case "url":       out.push((b.metodo ? `${b.metodo} - ` : "") + b.url, ...(b.pegado ? [] : [""])); break;
      case "codigo":    out.push(b.texto, ""); break;
      case "lista":     out.push(...b.items.map(it => `• ${it.texto}${it.url ? `: ${it.url}` : ""}`), ""); break;
      case "firma":     out.push(...b.lineas); break;
      default:          out.push(b.texto, ...(b.pegado ? [] : [""]));
    }
  });
  return aTexto(out.join("\n"));
}

function mailHtml(B) {
  const P = 'style="margin:0 0 12px"';
  const P0 = 'style="margin:0"';
  const html = B.map(b => {
    switch (b.tipo) {
      case "titulo":    return `<p style="margin:16px 0 8px;font-size:12pt"><b>${aHtml(b.texto)}</b></p>`;
      case "subtitulo": return `<p ${P0}><b>${aHtml(b.texto)}</b></p>`;
      case "url": {
        const limpia = aTexto(b.url);
        const link = tieneFalta(b.url) ? aHtml(b.url) : `<a href="${esc(limpia)}">${esc(limpia)}</a>`;
        return `<p ${b.pegado ? 'style="margin:0 0 4px"' : P}>${b.metodo ? `<b>${esc(b.metodo)}</b> - ` : ""}${link}</p>`;
      }
      case "codigo":
        return `<pre style="font-family:Consolas,'Courier New',monospace;font-size:10pt;background:#F4F5F7;padding:8px 12px;margin:0 0 12px;white-space:pre">${esc(b.texto)}</pre>`;
      case "lista":
        return `<ul style="margin:0 0 12px">${b.items.map(it => `<li>${
          it.url && !tieneFalta(it.url)
            ? `<a href="${esc(aTexto(it.url))}">${aHtml(it.texto)}</a>`
            : aHtml(it.texto) + (it.url ? `: ${aHtml(it.url)}` : "")
        }</li>`).join("")}</ul>`;
      case "firma":     return `<p ${P0}>${b.lineas.map(aHtml).join("<br>")}</p>`;
      default:          return `<p ${b.pegado ? 'style="margin:0 0 4px"' : P}>${aHtml(b.texto)}</p>`;
    }
  }).join("");
  return `<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt">${html}</div>`;
}

function renderMail() {
  const { asunto, bloques } = bloquesMail();
  document.getElementById("mailAsunto").innerHTML = aHtml(asunto);
  document.getElementById("mailCuerpo").innerHTML = mailHtml(bloques);
}

// Revisa que no falte nada antes de copiar
function mailListo() {
  if (modulosMarcados().length === 0) {
    aviso("Marcá al menos un módulo", "error");
    return false;
  }
  const { asunto, bloques } = bloquesMail();
  // Juntamos todos los textos del mail y buscamos las marcas de "falta"
  const textos = [asunto];
  const juntar = (x) => {
    if (typeof x === "string") textos.push(x);
    else if (x && typeof x === "object") Object.values(x).forEach(juntar);
  };
  juntar(bloques);
  const faltan = [...new Set(textos.flatMap(t => [...t.matchAll(reFalta)].map(r => r[1])))];
  if (faltan.length) {
    aviso(`Falta completar: ${faltan.join(", ")}`, "error");
    return false;
  }
  return true;
}

// ===============================
// BOTONES
// ===============================
async function copiarTexto(texto, mensaje = "Copiado") {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = texto;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  aviso(mensaje);
}

function copiarTodosLosEndpoints() {
  const seleccion = modulosMarcados();
  if (!seleccion.length) return aviso("Marcá al menos un módulo", "error");
  if (seleccion.some(usaTenant) && !estadoTenant().ok) return aviso("Completá un tenant válido", "error");

  const texto = seleccion.map(m => [
    m.nombre,
    ...(m.documentacion || []).map(d => `${d.nombre}: ${urlTexto(d.url, m)}`),
    ...m.endpoints.map(e =>
      `${e.nombre}: ${e.metodo ? e.metodo + " " : ""}${urlTexto(e.url, m)}` +
      (e.body ? "\n" + bodyTexto(e.body) : ""))
  ].join("\n")).join("\n\n");

  copiarTexto(texto, "Endpoints copiados");
}

function copiarAsunto() {
  if (!valor("clienteInput")) return aviso("Falta completar el cliente", "error");
  copiarTexto(aTexto(bloquesMail().asunto), "Asunto copiado");
}

async function copiarMail() {
  if (!mailListo()) return;
  const { bloques } = bloquesMail();
  const texto = mailTexto(bloques);
  const html = mailHtml(bloques);
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([texto], { type: "text/plain" })
      })
    ]);
    aviso("Mail copiado, pegalo en tu correo");
  } catch {
    copiarTexto(texto, "Mail copiado (sin formato)");
  }
}

function abrirEnCorreo() {
  if (!mailListo()) return;
  const { asunto, bloques } = bloquesMail();
  window.location.href =
    `mailto:?subject=${encodeURIComponent(aTexto(asunto))}&body=${encodeURIComponent(mailTexto(bloques))}`;
}

initEndpoints();
