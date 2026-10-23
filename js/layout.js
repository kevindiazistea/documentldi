// ===============================
// LAYOUT.JS - Barra lateral, barra superior y diálogos comunes
// Cada página indica en <body>:
//   data-activo="perfil" | "mails" | id de un módulo (ej: "ldi")
//   data-migas='[["Módulos"],["Listas de Informados","modulo.html?id=ldi"],["Informe"]]'
// ===============================

const ICONOS = {
  perfil:  '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  check:   '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  lista:   '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  llave:   '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  modulo:  '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  mail:    '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  lateral: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/>',
  menu:    '<path d="M4 6h16M4 12h16M4 18h16"/>'
};

function icono(nombre, tam = 20) {
  return `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[nombre] || ICONOS.modulo}</svg>`;
}

const LOGO = `
  <svg width="34" height="22" viewBox="0 0 34 22" aria-hidden="true">
    <defs><linearGradient id="lg" x1="0" x2="1"><stop offset="0" stop-color="#7FA0FF"/><stop offset="1" stop-color="#4E6CF0"/></linearGradient></defs>
    <path d="M2 14 6 4l5 14 5-14 4 10" fill="none" stroke="url(#lg)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="25" cy="15" r="2.6" fill="#E95066"/><circle cx="31" cy="15" r="2.6" fill="#FBC63C"/>
  </svg>`;

function armarLayout() {
  const body = document.body;
  const activo = body.dataset.activo || "";
  let migas = [];
  try { migas = JSON.parse(body.dataset.migas || "[]"); } catch {}

  // ---------- Lateral ----------
  const lateral = document.createElement("aside");
  lateral.className = "lateral-app";
  lateral.innerHTML = `
    <div class="lateral-cabecera">
      <a class="logo" href="index.html">${LOGO}<span>worldsync</span></a>
      <button class="btn-icono" id="btnCerrarLateral" aria-label="Ocultar menú">${icono("lateral", 18)}</button>
    </div>

    <button class="cliente-actual" id="btnCliente" type="button"></button>

    <nav class="menu" aria-label="Menú principal">
      <div class="menu-seccion">Consultor</div>
      <a href="index.html" data-id="perfil">${icono("perfil")}Mi perfil</a>

      <div class="menu-seccion">Módulos</div>
      <div id="menuModulos"></div>

      <div class="menu-seccion">Entrega</div>
      <a href="mails.html" data-id="mails">${icono("mail")}Mails</a>
    </nav>

    <a class="usuario-lateral" href="index.html" id="usuarioLateral"></a>
  `;

  // ---------- Principal ----------
  const principal = document.createElement("div");
  principal.className = "app-principal";
  principal.innerHTML = `
    <header class="barra-superior">
      <button class="btn-icono abrir-lateral" id="btnAbrirLateral" aria-label="Mostrar menú">${icono("menu", 18)}</button>
      <nav class="migas" aria-label="Ubicación" id="migas"></nav>
    </header>`;

  const main = document.querySelector("main");
  body.insertBefore(lateral, body.firstChild);
  body.insertBefore(principal, lateral.nextSibling);
  if (main) principal.appendChild(main);

  const velo = document.createElement("div");
  velo.className = "velo";
  body.appendChild(velo);

  ponerMigas(migas);
  marcarActivo(activo);
  pintarCliente();
  pintarUsuario();
  cargarMenuModulos(activo);
  armarDialogos();

  // Abrir / cerrar lateral
  const esCelu = () => window.matchMedia("(max-width: 900px)").matches;
  document.getElementById("btnCerrarLateral").onclick = () => {
    if (esCelu()) body.classList.remove("lateral-abierta");
    else { body.classList.add("lateral-cerrada"); localStorage.setItem("lateralCerrada", "1"); }
  };
  document.getElementById("btnAbrirLateral").onclick = () => {
    if (esCelu()) body.classList.add("lateral-abierta");
    else { body.classList.remove("lateral-cerrada"); localStorage.removeItem("lateralCerrada"); }
  };
  velo.onclick = () => body.classList.remove("lateral-abierta");
  if (localStorage.getItem("lateralCerrada")) body.classList.add("lateral-cerrada");

  document.getElementById("btnCliente").onclick = abrirCliente;
  document.addEventListener("cliente-cambiado", pintarCliente);
  document.addEventListener("perfil-cambiado", pintarUsuario);
}

function ponerMigas(migas) {
  const partes = [["worldsync", "index.html"], ...migas];
  document.getElementById("migas").innerHTML = partes.map(([txt, href], i) => {
    const ultimo = i === partes.length - 1;
    const el = ultimo ? `<span class="actual">${esc(txt)}</span>`
      : href ? `<a href="${esc(href)}">${esc(txt)}</a>` : `<span>${esc(txt)}</span>`;
    return (i ? '<span class="sep">›</span>' : "") + el;
  }).join("");
}

function marcarActivo(id) {
  document.querySelectorAll(".menu a").forEach(a => a.classList.toggle("activo", a.dataset.id === id));
}

async function cargarMenuModulos(activo) {
  try {
    const modulos = await obtenerModulos();
    document.getElementById("menuModulos").innerHTML = modulos.map(m =>
      `<a href="modulo.html?id=${esc(m.id)}" data-id="${esc(m.id)}">${icono(m.icono)}${esc(m.nombreCorto || m.nombre)}</a>`
    ).join("");
    marcarActivo(activo);
  } catch {
    document.getElementById("menuModulos").innerHTML =
      `<p class="ayuda" style="margin:4px 12px">No se pudo leer data/modulos.json</p>`;
  }
}

function pintarCliente() {
  const cliente = leerCliente();
  const tenant = leerTenant();
  document.getElementById("btnCliente").innerHTML = `
    <span class="ca-textos">
      <span class="ca-etiqueta">Cliente en curso</span>
      ${cliente
        ? `<span class="ca-nombre">${esc(cliente)}</span>
           <span class="ca-tenant">${tenant ? esc(tenant) : '<span class="ca-vacio">sin tenant</span>'}</span>`
        : `<span class="ca-nombre ca-vacio">Elegí un cliente</span>`}
    </span>
    <kbd>Cambiar</kbd>`;
}

function pintarUsuario() {
  const p = leerPerfil();
  document.getElementById("usuarioLateral").innerHTML = `
    <span class="avatar">${esc(iniciales(p.nombre))}</span>
    <span><b>${esc(p.nombre || "Completá tu perfil")}</b><span>${esc(p.puesto)}</span></span>`;
}

// ===============================
// DIÁLOGOS: cliente y perfil
// ===============================
function armarDialogos() {
  document.body.insertAdjacentHTML("beforeend", `
    <dialog class="dialogo" id="dlgCliente" aria-labelledby="dlgClienteTitulo">
      <form method="dialog" id="formCliente">
        <h2 id="dlgClienteTitulo">Cliente en curso</h2>
        <p class="dialogo-sub">Se usa en los endpoints, los mails y el informe.</p>

        <label for="dcCliente">Cliente</label>
        <input id="dcCliente" class="input" placeholder="Ej: Natura Pay" autocomplete="off">

        <label for="dcTenant">Tenant</label>
        <input id="dcTenant" class="input" placeholder="Ej: naturapay" autocomplete="off" spellcheck="false">
        <p class="ayuda" id="dcTenantAyuda">Solo minúsculas, números y guiones.</p>

        <div class="dialogo-botones">
          <button class="btn btn-sec" value="cancelar" formnovalidate>Cancelar</button>
          <button class="btn" value="guardar" id="dcGuardar">Guardar</button>
        </div>
      </form>
    </dialog>

    <dialog class="dialogo" id="dlgPerfil" aria-labelledby="dlgPerfilTitulo">
      <form method="dialog" id="formPerfil">
        <h2 id="dlgPerfilTitulo">Tu perfil</h2>
        <p class="dialogo-sub">Por ahora se carga a mano. Se usa en la firma de los mails.</p>

        <label for="dpNombre">Nombre y apellido</label>
        <input id="dpNombre" class="input" autocomplete="name" placeholder="Ej: Kevin Diaz">

        <label for="dpPuesto">Puesto</label>
        <input id="dpPuesto" class="input" placeholder="Ej: Consultor de servicio">

        <label for="dpArea">Área</label>
        <input id="dpArea" class="input" placeholder="Ej: Service Delivery">

        <label for="dpEmail">Mail</label>
        <input id="dpEmail" class="input" type="email" autocomplete="email" placeholder="tu@worldsys.io">

        <div class="dialogo-botones">
          <button class="btn btn-sec" value="cancelar" formnovalidate>Cancelar</button>
          <button class="btn" value="guardar">Guardar</button>
        </div>
      </form>
    </dialog>`);

  // ----- Cliente -----
  const dlgC = document.getElementById("dlgCliente");
  const cli = document.getElementById("dcCliente");
  const ten = document.getElementById("dcTenant");
  const ayuda = document.getElementById("dcTenantAyuda");

  const revisarTenant = () => {
    const sug = sugerirTenant(cli.value);
    ten.placeholder = sug ? `Ej: ${sug}` : "Ej: naturapay";
    const t = estadoTenant(ten.value);
    if (!t.ok && !t.vacio) {
      ayuda.innerHTML = t.sugerencia
        ? `Formato inválido. ¿Quisiste decir <button type="button" class="link-sugerencia">${esc(t.sugerencia)}</button>?`
        : "Formato inválido. Solo minúsculas, números y guiones.";
      ayuda.classList.add("error");
      ten.classList.add("input-error");
      const b = ayuda.querySelector("button");
      if (b) b.onclick = () => { ten.value = t.sugerencia; revisarTenant(); };
      return false;
    }
    ayuda.innerHTML = sug && t.vacio
      ? `Sugerido: <button type="button" class="link-sugerencia">${esc(sug)}</button> (algunos clientes usan otro)`
      : "Solo minúsculas, números y guiones.";
    const b = ayuda.querySelector("button");
    if (b) b.onclick = () => { ten.value = sug; revisarTenant(); };
    ayuda.classList.remove("error");
    ten.classList.remove("input-error");
    return true;
  };
  cli.addEventListener("input", revisarTenant);
  ten.addEventListener("input", revisarTenant);

  dlgC.addEventListener("close", () => {
    if (dlgC.returnValue !== "guardar") return;
    guardarClienteTenant(cli.value.trim(), ten.value.trim());
    aviso("Cliente actualizado");
  });
  document.getElementById("dcGuardar").addEventListener("click", e => {
    if (!revisarTenant()) { e.preventDefault(); ten.focus(); }
  });
  window._revisarTenantDialogo = revisarTenant;

  // ----- Perfil -----
  const dlgP = document.getElementById("dlgPerfil");
  dlgP.addEventListener("close", () => {
    if (dlgP.returnValue !== "guardar") return;
    guardarPerfil({
      nombre: document.getElementById("dpNombre").value.trim(),
      puesto: document.getElementById("dpPuesto").value.trim(),
      area: document.getElementById("dpArea").value.trim(),
      email: document.getElementById("dpEmail").value.trim()
    });
    aviso("Perfil guardado");
  });

  // Cualquier botón con data-abrir="cliente" o "perfil" abre su diálogo
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-abrir]");
    if (!b) return;
    e.preventDefault();
    if (b.dataset.abrir === "cliente") abrirCliente();
    if (b.dataset.abrir === "perfil") abrirPerfil();
  });
}

function abrirCliente() {
  document.getElementById("dcCliente").value = leerCliente();
  document.getElementById("dcTenant").value = leerTenant();
  window._revisarTenantDialogo();
  document.getElementById("dlgCliente").showModal();
  document.body.classList.remove("lateral-abierta");
}

function abrirPerfil() {
  const p = leerPerfil();
  document.getElementById("dpNombre").value = p.nombre;
  document.getElementById("dpPuesto").value = p.puesto;
  document.getElementById("dpArea").value = p.area;
  document.getElementById("dpEmail").value = p.email;
  document.getElementById("dlgPerfil").showModal();
}

armarLayout();
