// ===============================
// MODULOS.JS - Lógica compartida de endpoints y mails
// ===============================

// ---------- PLANTILLA GENERAL DEL MAIL (editá acá) ----------
// Se arma UN MAIL POR MÓDULO.
// Variables: {nombre}, {puesto}, {cliente}, {modulo}
// Lo propio de cada módulo (asunto, textos, endpoints, body) está en data/modulos.json
const PLANTILLA_MAIL = {
  asunto: "{modulo} – {cliente}",                                    // si el módulo no trae el suyo
  saludo: "Hola, ¿cómo están?",
  presentacion: "Mi nombre es {nombre} y formo parte del equipo de Worldsys.",
  intro: "Les comparto la información de {modulo} para {cliente}:",  // si el módulo no trae "introMail"
  cierre: "Ante cualquier duda o consulta, quedo a disposición.",
  firma: ["Saludos,", "{nombre}", "{puesto}", "Worldsys"]            // las líneas vacías se omiten
};

// Marcas para lo que falta completar (se pintan en rojo)
const FALTA_INI = "\u0001", FALTA_FIN = "\u0002";
const falta = (etiqueta) => FALTA_INI + etiqueta + FALTA_FIN;
const reFalta = /\u0001(.*?)\u0002/g;
const aHtml = (s) => esc(s).replace(reFalta, '<mark class="falta">[$1]</mark>');
const aTexto = (s) => String(s).replace(reFalta, "[$1]");
const tieneFalta = (s) => String(s).includes(FALTA_INI);

const bodyTexto = (body) => JSON.stringify(body, null, 2);
const atributo = (s) => JSON.stringify(s).replace(/"/g, "&quot;");

function usaTenant(m) {
  return JSON.stringify(m).includes("{tenant}");
}

// ===============================
// VARIABLES DE CADA MÓDULO (ej: código de Vault)
// ===============================
const valoresVar = {};
const claveVar = (m, v) => `var:${m.id}.${v.id}`;

function valorVariable(m, v) {
  const k = claveVar(m, v);
  let crudo = valoresVar[k];
  if (crudo === undefined) {
    const guardado = v.recordar ? localStorage.getItem(k) : null;
    crudo = guardado ?? (v.tipo === "lista" ? (v.defecto || []).join("\n") : (v.defecto || ""));
  }
  if (v.tipo === "lista") return crudo.split("\n").map(s => s.trim()).filter(Boolean);
  return crudo.trim();
}

function textoVariable(m, v) {
  const val = valorVariable(m, v);
  return Array.isArray(val) ? val.join("\n") : val;
}

function ponerVariable(m, v, texto) {
  const k = claveVar(m, v);
  valoresVar[k] = texto;
  if (v.recordar) localStorage.setItem(k, texto);
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

// Si la línea es una lista (fija o variable), devuelve sus ítems
function lineaLista(linea, m) {
  if (typeof linea === "object" && Array.isArray(linea.lista)) {
    return linea.lista.map(t => completarModulo(t, m));
  }
  const r = linea.match(/^\{(\w+)\}$/);
  const v = r && (m.variables || []).find(x => x.id === r[1] && x.tipo === "lista");
  if (!v) return null;
  const items = valorVariable(m, v);
  return items.length ? items : [falta(v.etiqueta)];
}

// URL con el tenant resaltado (para la pantalla)
function urlHtml(url) {
  const t = estadoTenant();
  return url.split("{tenant}").map(esc).join(
    t.ok ? `<mark>${esc(t.valor)}</mark>` : `<mark class="falta">{tenant}</mark>`);
}
const urlTexto = (url, m) => aTexto(completarModulo(url, m));

// ===============================
// MAIL
// ===============================
// Se arma como una lista de "bloques" y de ahí sale el texto plano y el HTML
function bloquesMail(m) {
  const perfil = leerPerfil();
  const datos = {
    nombre: perfil.nombre || falta("tu nombre"),
    puesto: perfil.puesto || "",
    cliente: leerCliente() || falta("cliente"),
    modulo: m.nombre
  };
  const g = (txt) => txt
    .replace(/\{nombre\}/g, datos.nombre)
    .replace(/\{puesto\}/g, datos.puesto)
    .replace(/\{cliente\}/g, datos.cliente)
    .replace(/\{modulo\}/g, datos.modulo);
  const P = PLANTILLA_MAIL;
  const B = [];

  B.push({ tipo: "p", texto: P.saludo });
  B.push({ tipo: "p", texto: g(P.presentacion) + " " + completarModulo(g(m.introMail || P.intro), m) });

  (m.intro || []).forEach(l => B.push({ tipo: "p", texto: completarModulo(g(l), m) }));

  if (m.documentacion?.length) {
    B.push({ tipo: "lista", items: m.documentacion.map(d => ({ texto: d.nombre, url: completarModulo(d.url, m) })) });
  }
  if (m.introEndpoints) B.push({ tipo: "p", texto: completarModulo(m.introEndpoints, m) });

  if (m.endpointsComoLista) {
    // Formato "Nombre: URL" en viñetas (ej: datos del SP en SAML)
    B.push({ tipo: "lista", items: m.endpoints.map(e => ({ etiqueta: e.nombre, url: completarModulo(e.url, m) })) });
  } else {
    m.endpoints.forEach((e, i) => {
      if (m.numerar) B.push({ tipo: "subtitulo", texto: `${i + 1}. ${e.nombre}` });
      if (e.texto) B.push({ tipo: "p", texto: completarModulo(e.texto, m), pegado: true });
      B.push({ tipo: "url", metodo: e.metodo, url: completarModulo(e.url, m), pegado: !!e.body || !!e.nota });
      if (e.body) B.push({ tipo: "codigo", texto: bodyTexto(e.body) });
      if (e.nota) B.push({ tipo: "p", texto: completarModulo(e.nota, m) });
    });
  }

  (m.cierre || []).forEach(l => {
    const items = lineaLista(l, m);
    if (items) B.push({ tipo: "lista", items: items.map(t => ({ texto: t })) });
    else B.push({ tipo: "p", texto: completarModulo(g(l), m) });
  });

  B.push({ tipo: "p", texto: P.cierre });
  B.push({ tipo: "firma", lineas: P.firma.map(g).filter(l => l.trim()) });

  return { asunto: g(m.asunto || P.asunto), bloques: B };
}

function itemTexto(it) {
  if (it.etiqueta) return `${it.etiqueta}: ${it.url}`;
  return it.texto + (it.url ? `: ${it.url}` : "");
}

function mailTexto(B) {
  const out = [];
  B.forEach(b => {
    switch (b.tipo) {
      case "subtitulo": out.push(b.texto); break;
      case "url":       out.push((b.metodo ? `${b.metodo} - ` : "") + b.url, ...(b.pegado ? [] : [""])); break;
      case "codigo":    out.push(b.texto, ""); break;
      case "lista":     out.push(...b.items.map(it => `• ${itemTexto(it)}`), ""); break;
      case "firma":     out.push(...b.lineas); break;
      default:          out.push(b.texto, ...(b.pegado ? [] : [""]));
    }
  });
  return aTexto(out.join("\n"));
}

function linkHtml(url, texto) {
  if (tieneFalta(url)) return aHtml(url);
  const limpia = aTexto(url);
  return `<a href="${esc(limpia)}">${esc(texto ?? limpia)}</a>`;
}

function mailHtml(B) {
  const P = 'style="margin:0 0 12px"';
  const P0 = 'style="margin:0"';
  const html = B.map(b => {
    switch (b.tipo) {
      case "subtitulo": return `<p ${P0}><b>${aHtml(b.texto)}</b></p>`;
      case "url":
        return `<p ${b.pegado ? 'style="margin:0 0 4px"' : P}>${b.metodo ? `<b>${esc(b.metodo)}</b> - ` : ""}${linkHtml(b.url)}</p>`;
      case "codigo":
        return `<pre style="font-family:Consolas,'Courier New',monospace;font-size:10pt;background:#F4F5F7;color:#1B1F2E;padding:8px 12px;margin:0 0 12px;white-space:pre">${esc(b.texto)}</pre>`;
      case "lista":
        return `<ul style="margin:0 0 12px">${b.items.map(it => `<li>${
          it.etiqueta ? `<b>${aHtml(it.etiqueta)}:</b> ${linkHtml(it.url)}`
          : it.url ? (tieneFalta(it.url) ? `${aHtml(it.texto)}: ${aHtml(it.url)}` : linkHtml(it.url, aTexto(it.texto)))
          : aHtml(it.texto)
        }</li>`).join("")}</ul>`;
      case "firma":     return `<p ${P0}>${b.lineas.map(aHtml).join("<br>")}</p>`;
      default:          return `<p ${b.pegado ? 'style="margin:0 0 4px"' : P}>${aHtml(b.texto)}</p>`;
    }
  }).join("");
  return `<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1B1F2E">${html}</div>`;
}

// Lista de lo que falta para poder copiar el mail
function faltantesMail(m) {
  const { asunto, bloques } = bloquesMail(m);
  const textos = [asunto];
  const juntar = (x) => {
    if (typeof x === "string") textos.push(x);
    else if (x && typeof x === "object") Object.values(x).forEach(juntar);
  };
  juntar(bloques);
  return [...new Set(textos.flatMap(t => [...t.matchAll(reFalta)].map(r => r[1])))];
}

// Texto de todos los endpoints de un módulo (para "Copiar todos")
function endpointsTexto(m) {
  return [
    m.nombre,
    ...(m.documentacion || []).map(d => `${d.nombre}: ${urlTexto(d.url, m)}`),
    ...m.endpoints.map(e =>
      `${e.nombre}: ${e.metodo ? e.metodo + " " : ""}${urlTexto(e.url, m)}` +
      (e.body ? "\n" + bodyTexto(e.body) : ""))
  ].join("\n");
}
