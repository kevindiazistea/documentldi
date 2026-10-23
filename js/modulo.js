// ===============================
// MODULO.JS - Página de un módulo (endpoints armados con el cliente en curso)
// ===============================

let moduloActual = null;

async function initModulo() {
  const id = new URLSearchParams(location.search).get("id");
  let modulos = [];
  try { modulos = await obtenerModulos(); } catch {
    aviso("No se pudo leer data/modulos.json", "error");
    return;
  }

  moduloActual = modulos.find(m => m.id === id);
  if (!moduloActual) {
    document.querySelector("main").innerHTML = `
      <div class="vacio"><strong>No encontramos ese módulo</strong>
      <p>Elegí uno desde el menú de la izquierda.</p></div>`;
    return;
  }

  const m = moduloActual;
  document.title = `${m.nombreCorto || m.nombre} · worldsync`;
  ponerMigas([["Módulos"], [m.nombreCorto || m.nombre]]);
  marcarActivo(m.id);
  // El menú carga los módulos en paralelo; volvemos a marcar por las dudas
  setTimeout(() => marcarActivo(m.id), 200);

  document.getElementById("moduloIcono").innerHTML = icono(m.icono, 44);
  document.getElementById("moduloNombre").textContent = m.nombreCorto || m.nombre;
  document.getElementById("moduloDescripcion").textContent = m.descripcion || "";
  document.getElementById("btnArmarMail").href = `mails.html?modulo=${encodeURIComponent(m.id)}`;

  document.getElementById("moduloPestanas").innerHTML =
    `<a class="activa" href="modulo.html?id=${esc(m.id)}">Endpoints</a>` +
    (m.pestanas || []).map(p => `<a href="${esc(p.url)}">${esc(p.nombre)}</a>`).join("");

  pintar();
  document.addEventListener("cliente-cambiado", pintar);
}

function pintar() {
  const m = moduloActual;
  const t = estadoTenant();
  const cliente = leerCliente();
  const [uno, varios] = m.unidad || ["endpoint", "endpoints"];
  const n = m.endpoints.length;

  document.getElementById("moduloPildoras").innerHTML = `
    <span class="pildora">${n} ${n === 1 ? uno : varios}</span>
    ${usaTenant(m)
      ? `<span class="pildora mono"><span class="punto ${t.ok ? "ok" : "aviso"}"></span>${t.ok ? esc(t.valor) : "sin tenant"}</span>`
      : `<span class="pildora">Fijo, no depende del tenant</span>`}`;

  // Aviso si el módulo necesita tenant y no está
  document.getElementById("avisoTenant").innerHTML = usaTenant(m) && !t.ok ? `
    <div class="caja" style="margin-bottom:16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;border:1px solid rgba(242,184,75,.35)">
      <span style="flex:1;min-width:200px">
        <b>Falta el tenant del cliente.</b>
        <span style="color:var(--tinta-suave)"> Las URLs de este módulo cambian según el tenant.</span>
      </span>
      <button class="btn" data-abrir="cliente">Completar cliente y tenant</button>
    </div>` : "";

  const fila = (nombre, contenido, copiar, mensaje) => `
    <div class="endpoint">
      <span class="endpoint-nombre">${esc(nombre)}</span>
      ${contenido}
      ${copiar !== null ? `<button class="btn-texto" onclick="copiarTexto(${atributo(copiar)}, '${mensaje}')">Copiar</button>` : ""}
    </div>`;

  document.getElementById("listaEndpoints").innerHTML = `
    <div class="grupo-endpoints">
      <div class="grupo-titulo">
        <span>${esc(m.unidad ? m.unidad[1].replace(/^./, c => c.toUpperCase()) : "Endpoints")}</span>
      </div>
      ${m.adjunto ? `
        <div class="endpoint">
          <span class="endpoint-nombre">Instructivo</span>
          <span>${esc(m.adjunto.nombre)}</span>
          <a class="btn-texto" href="${esc(m.adjunto.archivo)}" download>Descargar</a>
        </div>` : ""}
      ${(m.documentacion || []).map(d =>
        fila(d.nombre, `<code class="endpoint-url">${urlHtml(d.url)}</code>`, urlTexto(d.url, m), "Link copiado")).join("")}
      ${m.endpoints.map(e => `
        <div class="endpoint">
          <span class="endpoint-nombre">${esc(e.nombre)}</span>
          <span class="endpoint-linea">
            ${e.metodo ? `<span class="metodo">${esc(e.metodo)}</span>` : ""}
            <code class="endpoint-url">${urlHtml(e.url)}</code>
          </span>
          <button class="btn-texto" onclick="copiarTexto(${atributo(urlTexto(e.url, m))}, 'Copiado')">Copiar</button>
          ${e.body ? `
            <pre class="endpoint-body">${esc(bodyTexto(e.body))}</pre>
            <button class="btn-texto" onclick="copiarTexto(${atributo(bodyTexto(e.body))}, 'Body copiado')">Copiar body</button>` : ""}
        </div>`).join("")}
    </div>`;

  document.getElementById("estadoModulo").innerHTML = cliente
    ? `Cliente: <b>${esc(cliente)}</b>${usaTenant(m) ? ` <span class="separador"></span>Tenant: <b>${esc(t.ok ? t.valor : "falta")}</b>` : ""}`
    : `<button class="btn-texto" style="padding:0" data-abrir="cliente">Elegí un cliente</button>`;
}

function copiarTodo() {
  if (usaTenant(moduloActual) && !estadoTenant().ok) return aviso("Completá un tenant válido", "error");
  copiarTexto(endpointsTexto(moduloActual), "Todo copiado");
}

initModulo();
