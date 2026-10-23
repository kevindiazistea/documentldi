// ===============================
// MAILS.JS - Un mail por módulo
// ===============================

let modulos = [];
const marcados = new Set();

async function initMails() {
  try { modulos = await obtenerModulos(); } catch {
    aviso("No se pudo leer data/modulos.json", "error");
    return;
  }

  // Si venís desde un módulo, viene marcado ese; si no, los "porDefecto"
  const pedido = new URLSearchParams(location.search).get("modulo");
  if (pedido && modulos.some(m => m.id === pedido)) marcados.add(pedido);
  else modulos.filter(m => m.porDefecto).forEach(m => marcados.add(m.id));

  document.getElementById("selectorModulos").innerHTML = modulos.map(m => `
    <label><input type="checkbox" value="${esc(m.id)}" ${marcados.has(m.id) ? "checked" : ""}>${esc(m.nombreCorto || m.nombre)}</label>`).join("");

  document.getElementById("selectorModulos").addEventListener("change", e => {
    e.target.checked ? marcados.add(e.target.value) : marcados.delete(e.target.value);
    pintarVariables();
    pintarMails();
  });

  document.addEventListener("perfil-cambiado", pintarTodo);
  document.addEventListener("cliente-cambiado", pintarTodo);
  pintarTodo();
}

const seleccion = () => modulos.filter(m => marcados.has(m.id));

function pintarTodo() {
  pintarResumen();
  pintarVariables();
  pintarMails();
}

function pintarResumen() {
  const p = leerPerfil();
  const cliente = leerCliente();
  const t = estadoTenant();

  document.getElementById("resumenFirma").innerHTML = p.nombre
    ? `<div style="display:flex;align-items:center;gap:10px">
         <span class="avatar">${esc(iniciales(p.nombre))}</span>
         <span style="flex:1;min-width:0"><b>${esc(p.nombre)}</b><br><span style="color:var(--tinta-suave);font-size:13px">${esc(p.puesto)}</span></span>
         <button class="btn-texto" data-abrir="perfil">Editar</button>
       </div>`
    : `<button class="btn btn-sec btn-bloque" data-abrir="perfil">Completar tu perfil</button>`;

  document.getElementById("resumenCliente").innerHTML = cliente
    ? `<div style="display:flex;align-items:center;gap:10px">
         <span style="flex:1;min-width:0"><b>${esc(cliente)}</b><br>
           <span class="codigo">${t.ok ? esc(t.valor) : '<span style="color:var(--ambar)">sin tenant</span>'}</span></span>
         <button class="btn-texto" data-abrir="cliente">Cambiar</button>
       </div>`
    : `<button class="btn btn-sec btn-bloque" data-abrir="cliente">Elegir cliente</button>`;
}

// Campos propios de los módulos marcados (ej: código de Vault)
function pintarVariables() {
  const conVars = seleccion().filter(m => m.variables?.length);
  const caja = document.getElementById("cajaVariables");
  caja.hidden = conVars.length === 0;

  document.getElementById("camposVariables").innerHTML = conVars.map(m => m.variables.map(v => {
    const id = `var-${m.id}-${v.id}`;
    const valor = textoVariable(m, v);
    const campo = v.tipo === "lista"
      ? `<textarea id="${id}" class="input" rows="3" data-mod="${esc(m.id)}" data-var="${esc(v.id)}">${esc(valor)}</textarea>
         <p class="ayuda">Uno por línea.</p>`
      : `<input id="${id}" class="input" data-mod="${esc(m.id)}" data-var="${esc(v.id)}" value="${esc(valor)}"
           placeholder="${esc(v.placeholder || "")}" autocomplete="off" spellcheck="false">`;
    return `<label for="${id}">${esc(v.etiqueta)} <span style="color:var(--tenue);font-weight:500">· ${esc(m.nombre)}</span></label>${campo}`;
  }).join("")).join("");
}

document.getElementById("camposVariables").addEventListener("input", e => {
  const el = e.target;
  const m = modulos.find(x => x.id === el.dataset.mod);
  const v = m?.variables.find(x => x.id === el.dataset.var);
  if (!v) return;
  ponerVariable(m, v, el.value);
  pintarMails();
});

function pintarMails() {
  const cont = document.getElementById("listaMails");
  const sel = seleccion();

  if (!sel.length) {
    cont.innerHTML = `<div class="vacio"><strong>Ningún módulo elegido</strong><p>Marcá arriba los módulos para armar sus mails.</p></div>`;
    return;
  }

  cont.innerHTML = sel.map(m => {
    const { asunto, bloques } = bloquesMail(m);
    const id = esc(m.id);
    return `
      <article class="mail">
        <header class="mail-cabecera">
          <span class="mail-modulo">${esc(m.nombre)}</span>
          <span class="mail-botones">
            <button class="btn btn-sec btn-chico" onclick="copiarAsunto('${id}')">Copiar asunto</button>
            <button class="btn btn-sec btn-chico" onclick="abrirEnCorreo('${id}')">Abrir en el correo</button>
            <button class="btn btn-chico" onclick="copiarMail('${id}')">Copiar mail</button>
          </span>
        </header>
        <div class="mail-asunto">
          <span class="mail-etiqueta">Asunto</span>
          <span>${aHtml(asunto)}</span>
        </div>
        ${m.adjunto ? `
          <div class="mail-adjunto">
            <span class="mail-etiqueta">Adjuntar</span>
            <span>${esc(m.adjunto.nombre)}</span>
            <a class="btn-texto" href="${esc(m.adjunto.archivo)}" download>Descargar</a>
          </div>` : ""}
        <div class="mail-cuerpo"><div class="mail-hoja">${mailHtml(bloques)}</div></div>
      </article>`;
  }).join("");
}

// ===============================
// BOTONES
// ===============================
const moduloPorId = (id) => modulos.find(m => m.id === id);

function mailListo(m) {
  const faltan = faltantesMail(m);
  if (faltan.length) {
    aviso(`Falta completar: ${faltan.join(", ")}`, "error");
    return false;
  }
  return true;
}

function copiarAsunto(id) {
  if (!leerCliente()) return aviso("Falta elegir el cliente", "error");
  copiarTexto(aTexto(bloquesMail(moduloPorId(id)).asunto), "Asunto copiado");
}

async function copiarMail(id) {
  const m = moduloPorId(id);
  if (!mailListo(m)) return;
  const { bloques } = bloquesMail(m);
  const texto = mailTexto(bloques);
  const html = mailHtml(bloques);
  try {
    // Copia con formato (negritas, links) y también en texto plano
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([texto], { type: "text/plain" })
      })
    ]);
    aviso(m.adjunto ? "Mail copiado. Acordate de adjuntar el instructivo" : "Mail copiado, pegalo en tu correo");
  } catch {
    copiarTexto(texto, "Mail copiado (sin formato)");
  }
}

function abrirEnCorreo(id) {
  const m = moduloPorId(id);
  if (!mailListo(m)) return;
  const { asunto, bloques } = bloquesMail(m);
  location.href = `mailto:?subject=${encodeURIComponent(aTexto(asunto))}&body=${encodeURIComponent(mailTexto(bloques))}`;
}

initMails();
