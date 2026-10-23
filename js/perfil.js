// ===============================
// PERFIL.JS - Página principal del consultor
// ===============================

function pintarPerfil() {
  const p = leerPerfil();
  const cliente = leerCliente();
  const tenant = leerTenant();

  document.getElementById("avatarIniciales").textContent = iniciales(p.nombre);
  document.getElementById("perfilNombre").textContent = p.nombre || "Completá tu perfil";
  document.getElementById("perfilPuesto").textContent = [p.puesto, p.area].filter(Boolean).join(" · ");

  document.getElementById("perfilPildoras").innerHTML = [
    p.email ? `<span class="pildora mono">${esc(p.email)}</span>` : `<button class="pildora" data-abrir="perfil" style="border:0;cursor:pointer;font:inherit">+ Agregar mail</button>`,
    `<button class="pildora" data-abrir="cliente" style="border:0;cursor:pointer;font:inherit">
       <span class="punto ${cliente ? "ok" : "aviso"}"></span>${cliente ? "Cliente: " + esc(cliente) : "Sin cliente en curso"}
     </button>`
  ].join("");

  const busquedas = leerBusquedas().length;
  const t = estadoTenant();
  document.getElementById("metricas").innerHTML = `
    <div class="metrica">
      <div class="metrica-titulo">Cliente en curso</div>
      <div class="metrica-valor" title="${esc(cliente)}">${esc(cliente || "—")}</div>
      <div class="metrica-sub"><button class="btn-texto" style="padding:0" data-abrir="cliente">${cliente ? "Cambiar" : "Elegir cliente"}</button></div>
    </div>
    <div class="metrica">
      <div class="metrica-titulo">Tenant</div>
      <div class="metrica-valor mono">${esc(tenant || "—")}</div>
      <div class="metrica-sub">${t.ok ? "Listo para armar URLs" : tenant ? "Formato inválido" : "Falta completarlo"}</div>
    </div>
    <div class="metrica">
      <div class="metrica-titulo">Búsquedas LDI</div>
      <div class="metrica-valor">${busquedas}</div>
      <div class="metrica-sub"><a href="informe.html" style="text-decoration:none">Ir al informe de fuentes</a></div>
    </div>`;
}

async function pintarModulos() {
  const cont = document.getElementById("grillaModulos");
  try {
    const modulos = await obtenerModulos();
    cont.innerHTML = modulos.map(m => {
      const [uno, varios] = m.unidad || ["endpoint", "endpoints"];
      const n = m.endpoints.length;
      return `
        <a class="tarjeta-modulo" href="modulo.html?id=${esc(m.id)}">
          <span class="tm-icono">${icono(m.icono, 22)}</span>
          <h3>${esc(m.nombreCorto || m.nombre)}</h3>
          <p>${esc(m.descripcion || "")}</p>
          <span class="tm-pie">
            <span class="pildora">${n} ${n === 1 ? uno : varios}</span>
            <span class="pildora">${usaTenant(m) ? "Cambia según el tenant" : "Fijo"}</span>
          </span>
        </a>`;
    }).join("");
  } catch {
    cont.innerHTML = `<div class="vacio"><strong>No se pudo leer data/modulos.json</strong></div>`;
  }
}

document.getElementById("iconoMails").innerHTML = icono("mail", 22);
document.addEventListener("perfil-cambiado", pintarPerfil);
document.addEventListener("cliente-cambiado", pintarPerfil);
pintarPerfil();
pintarModulos();

// Primera vez: si no hay nombre, abrimos el perfil para completarlo
if (!leerPerfil().nombre) setTimeout(abrirPerfil, 300);
