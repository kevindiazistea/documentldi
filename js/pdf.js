// ===============================
// PDF.JS - Informe de Listas de Informados (pdfmake)
// ===============================

// Colores del informe (azul de Worldsys + los de la web)
const PDF_TINTA  = "#282E6B";
const PDF_SUAVE  = "#56627A";
const PDF_LINEA  = "#D6DCE4";
const PDF_FONDO  = "#F2F4F7";
const PDF_ACENTO = "#3D63A8";

// Usa los colores por tipo de comun.js; si no está cargado, gris
function pdfColorTipo(tipo) {
  return typeof colorTipo === "function" ? colorTipo(tipo) : "#5B6770";
}

// Barra de colores proporcional a los tipos (igual al "lomo" de la web)
function pdfBarraTipos(fuentes, ancho, alto = 4) {
  const total = fuentes.length || 1;
  const cuenta = {};
  fuentes.forEach(f => cuenta[f.tipo] = (cuenta[f.tipo] || 0) + 1);

  let x = 0;
  const rects = Object.entries(cuenta).map(([tipo, n]) => {
    const w = ancho * n / total;
    const r = { type: "rect", x, y: 0, w, h: alto, color: pdfColorTipo(tipo) };
    x += w;
    return r;
  });
  return { canvas: rects, margin: [0, 0, 0, 8] };
}

// Título de sección numerado
function pdfSeccion(numero, texto) {
  return {
    headlineLevel: 1, // sirve para que el título nunca quede solo al final de una hoja
    margin: [0, 18, 0, 10],
    columns: [
      { text: String(numero), width: 22, fontSize: 14, bold: true, color: PDF_ACENTO },
      { text: texto, fontSize: 14, bold: true, color: PDF_TINTA }
    ]
  };
}

// Diseño de tablas: encabezado oscuro + filas alternadas
const pdfLayoutTabla = {
  hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0 : 0.5,
  vLineWidth: () => 0,
  hLineColor: () => PDF_LINEA,
  fillColor: (fila) => fila === 0 ? PDF_TINTA : (fila % 2 === 0 ? PDF_FONDO : null),
  paddingLeft: () => 6,
  paddingRight: () => 6,
  paddingTop: () => 5,
  paddingBottom: () => 5
};

function pdfEncabezadoTabla(titulos, centrar = []) {
  return titulos.map(t => ({ text: t, bold: true, color: "#FFFFFF", fontSize: 9,
    alignment: centrar.includes(t) ? "center" : "left" }));
}

// Nombre de archivo sin caracteres raros
function pdfNombreArchivo(cliente) {
  const limpio = (cliente || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  const hoy = new Date().toISOString().slice(0, 10);
  return `informeLDI_${limpio || "CO"}_${hoy}.pdf`;
}

// ===============================
// FUNCIÓN PRINCIPAL
// ===============================
function generarPDF(busquedas, fuentes, cliente) {

  const fecha = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
  const ANCHO = 515; // ancho útil de una hoja A4 con los márgenes usados

  // Fuentes de cada búsqueda (respetando el orden del JSON)
  const detalle = busquedas.map(b => ({
    nombre: b.nombre.trim(),
    // Solo las fuentes que existen en el JSON (si no está, no aparece)
    fuentes: fuentes.filter(f => b.fuentes.includes(f.codigo)),
    similitud: leerSimilitud(b, "similitud"),
    similitudInversa: leerSimilitud(b, "similitudInversa")
  }));

  // Fuentes únicas (sin repetir si están en varias búsquedas)
  const unicas = [];
  const vistos = new Set();
  detalle.forEach(d => d.fuentes.forEach(f => {
    if (!vistos.has(f.codigo)) { vistos.add(f.codigo); unicas.push(f); }
  }));

  const paises = new Set(unicas.map(f => f.pais)).size;
  const hayDescripcion = unicas.some(f => f.descripcion);

  const contenido = [];

  // ---------- PORTADA / ENCABEZADO ----------
  const hayLogo = typeof LOGO_WORLDSYS !== "undefined";

  contenido.push({
    columns: [
      hayLogo ? { image: LOGO_WORLDSYS, width: 96 } : { text: "" },
      {
        text: "Compliance One\nListas de Informados",
        fontSize: 10,
        color: PDF_SUAVE,
        alignment: "right",
        margin: [0, 18, 0, 0]
      }
    ],
    margin: [0, -16, 0, 20]
  });

  contenido.push({
    text: "Implementación de fuentes en Listas de Informados en Compliance One",
    fontSize: 20,
    bold: true,
    color: PDF_TINTA,
    lineHeight: 1.1,
    margin: [0, 0, 0, 16]
  });

  // Recuadro con los datos del informe
  const dato = (etiqueta, valor) => ({
    stack: [
      { text: etiqueta, fontSize: 8, color: PDF_SUAVE },
      { text: valor, fontSize: 12, bold: true, color: PDF_TINTA, margin: [0, 2, 0, 0] }
    ]
  });

  contenido.push({
    table: {
      widths: ["*", "auto", "auto", "auto", "auto"],
      body: [[
        dato("Cliente", cliente || "Sin cliente"),
        dato("Fecha", fecha),
        dato("Búsquedas", String(detalle.length)),
        dato("Fuentes", String(unicas.length)),
        dato("Países", String(paises))
      ]]
    },
    layout: {
      hLineWidth: () => 0, vLineWidth: () => 0,
      fillColor: () => PDF_FONDO,
      paddingLeft: () => 12, paddingRight: () => 12,
      paddingTop: () => 10, paddingBottom: () => 10
    },
    margin: [0, 0, 0, 4]
  });
  contenido.push(pdfBarraTipos(unicas, ANCHO, 4));

  // ---------- 1. BÚSQUEDAS INCLUIDAS ----------
  contenido.push(pdfSeccion(1, "Búsquedas incluidas"));

  contenido.push({
    table: {
      headerRows: 1,
      widths: ["*", 42, 50, 50, 140],
      body: [
        pdfEncabezadoTabla(["Búsqueda", "Fuentes", "Similitud", "Inversa", "Tipos de lista"],
                           ["Fuentes", "Similitud", "Inversa"]),
        ...detalle.map(d => {
          const tipos = [...new Set(d.fuentes.map(f => f.tipo))];
          return [
            { text: d.nombre, bold: true, fontSize: 10 },
            { text: String(d.fuentes.length), fontSize: 10, alignment: "center" },
            { text: `${d.similitud}%`, fontSize: 10, alignment: "center" },
            { text: `${d.similitudInversa}%`, fontSize: 10, alignment: "center" },
            {
              fontSize: 9,
              text: tipos.flatMap((t, i) => [
                { text: t, bold: true, color: pdfColorTipo(t) },
                i < tipos.length - 1 ? { text: ",  ", color: PDF_SUAVE } : ""
              ])
            }
          ];
        })
      ]
    },
    layout: pdfLayoutTabla
  });

  // ---------- 2. DETALLE POR BÚSQUEDA ----------
  contenido.push(pdfSeccion(2, "Detalle por búsqueda"));

  detalle.forEach((d, i) => {
    const titulos = ["Fuente", "País", "Tipo", "Código"];
    const anchos = ["*", 75, 80, 125];
    if (hayDescripcion) { titulos.push("Descripción"); anchos.splice(0, 1, 130); anchos.push("*"); }

    contenido.push({
      // Mantiene el título pegado a su tabla (no queda solo al final de una hoja)
      unbreakable: d.fuentes.length <= 6,
      stack: [
        {
          columns: [
            { text: d.nombre, fontSize: 12, bold: true, color: PDF_TINTA },
            { text: `${d.fuentes.length} ${d.fuentes.length === 1 ? "fuente" : "fuentes"}   |   ` +
                    `Similitud ${d.similitud}%   |   Inversa ${d.similitudInversa}%`,
              width: "auto", fontSize: 9, color: PDF_SUAVE, margin: [0, 2, 0, 0] }
          ],
          margin: [0, i === 0 ? 0 : 14, 0, 4]
        },
        pdfBarraTipos(d.fuentes, ANCHO, 3),
        {
          table: {
            headerRows: 1,
            dontBreakRows: true,
            keepWithHeaderRows: 1,
            widths: anchos,
            body: [
              pdfEncabezadoTabla(titulos),
              ...d.fuentes.map(f => {
                const fila = [
                  { text: f.titulo, fontSize: 9 },
                  { text: f.pais, fontSize: 9 },
                  { text: f.tipo, fontSize: 9, bold: true, color: pdfColorTipo(f.tipo) },
                  { text: f.codigo, fontSize: 8, color: PDF_SUAVE }
                ];
                if (hayDescripcion) fila.push({ text: f.descripcion || "", fontSize: 8 });
                return fila;
              })
            ]
          },
          layout: pdfLayoutTabla
        }
      ]
    });
  });

  // ---------- 3. FUENTES UTILIZADAS (agrupadas por tipo, sin repetir) ----------
  contenido.push(pdfSeccion(3, "Fuentes utilizadas"));
  contenido.push({
    text: `${unicas.length} fuentes distintas, agrupadas por tipo de lista.`,
    fontSize: 9, color: PDF_SUAVE, margin: [0, -4, 0, 8]
  });

  const porTipo = {};
  unicas.forEach(f => (porTipo[f.tipo] = porTipo[f.tipo] || []).push(f));

  Object.entries(porTipo)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([tipo, lista]) => {
      contenido.push({
        unbreakable: lista.length <= 10, // los grupos grandes pueden seguir en la otra hoja
        margin: [0, 0, 0, 10],
        table: {
          widths: [3, "*"],
          body: [[
            { text: "", fillColor: pdfColorTipo(tipo) },
            {
              stack: [
                { text: `${tipo} (${lista.length})`, bold: true, fontSize: 10, color: pdfColorTipo(tipo), margin: [0, 0, 0, 3] },
                ...lista.map(f => ({
                  text: [
                    { text: f.titulo, fontSize: 9 },
                    { text: `   ${f.pais}`, fontSize: 8, color: PDF_SUAVE }
                  ],
                  margin: [0, 1, 0, 1]
                }))
              ]
            }
          ]]
        },
        layout: {
          hLineWidth: () => 0, vLineWidth: () => 0,
          paddingLeft: (i) => i === 0 ? 0 : 10,
          paddingRight: () => 0, paddingTop: () => 2, paddingBottom: () => 2
        }
      });
    });

  // ---------- 4. OBSERVACIONES FINALES ----------
  contenido.push(pdfSeccion(4, "Observaciones finales"));
  contenido.push({
    unbreakable: true,
    table: {
      widths: ["*"],
      body: [[{
        stack: [
          { text: "Este informe fue generado automáticamente por el módulo de Listas de Informados de Compliance One.", fontSize: 10 },
          {
            text: [
              { text: "Parametrización: ", bold: true },
              `los porcentajes de "Similitud" y "Similitud inversa" se configuran por búsqueda y figuran en la sección 1.`
            ],
            fontSize: 10, margin: [0, 6, 0, 0]
          }
        ]
      }]]
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: (i) => i === 0 ? 3 : 0,
      vLineColor: () => PDF_ACENTO,
      fillColor: () => PDF_FONDO,
      paddingLeft: () => 12, paddingRight: () => 12,
      paddingTop: () => 10, paddingBottom: () => 10
    }
  });

  // ---------- DOCUMENTO ----------
  const docDefinition = {
    pageSize: "A4",
    pageMargins: [40, 64, 40, 50],
    info: {
      title: `Informe LDI - ${cliente || "Sin cliente"}`,
      author: "Compliance One",
      subject: "Listas de Informados"
    },
    defaultStyle: { fontSize: 10, color: PDF_TINTA, lineHeight: 1.15 },

    // Encabezado desde la hoja 2
    header: (paginaActual) => paginaActual === 1 ? null : {
      margin: [40, 18, 40, 0],
      stack: [
        {
          columns: [
            hayLogo ? { image: LOGO_WORLDSYS, width: 40 } : { text: "" },
            { text: "Listas de Informados  |  Compliance One", fontSize: 8, color: PDF_SUAVE, margin: [0, 6, 0, 0] },
            { text: cliente || "", fontSize: 8, bold: true, color: PDF_TINTA, alignment: "right", margin: [0, 6, 0, 0] }
          ]
        },
        { canvas: [{ type: "line", x1: 0, y1: 4, x2: ANCHO, y2: 4, lineWidth: 0.5, lineColor: PDF_LINEA }] }
      ]
    },

    // Pie en todas las hojas: fecha + "Página X de Y"
    footer: (paginaActual, totalPaginas) => ({
      margin: [40, 16, 40, 0],
      columns: [
        { text: `Generado el ${fecha}`, fontSize: 8, color: PDF_SUAVE },
        { text: `Página ${paginaActual} de ${totalPaginas}`, fontSize: 8, color: PDF_SUAVE, alignment: "right" }
      ]
    }),

    // Si un título de sección cae casi al final de la hoja, pasa a la siguiente
    pageBreakBefore: (nodo, siguientesEnPagina) =>
      nodo.headlineLevel === 1 && siguientesEnPagina.length < 6,

    content: contenido
  };

  pdfMake.createPdf(docDefinition).download(pdfNombreArchivo(cliente));
}
