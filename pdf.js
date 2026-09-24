function generarPDF(búsquedas, fuentes, cliente) {

  const fecha = new Date().toLocaleDateString("es-AR");
  const contenido = [];

  // Encabezado
  contenido.push({
    text: "Implementación de fuentes en Listas de Informados en Compliance One",
    alignment: "center",
    fontSize: 20,
    bold: true,
    color: "#0056b3",
    margin: [0, 0, 0, 10]
  });

  contenido.push({
    text: `Cliente: ${cliente}\nFecha: ${fecha}\n\n`,
    fontSize: 12,
    alignment: "center"
  });

  // - Búsquedas incluidas
  contenido.push({
    text: "- Búsquedas incluidas",
    style: "sectionHeader"
  });

  búsquedas.forEach(b => {
    contenido.push({
      text: `• ${b.nombre}`,
      margin: [0, 5, 0, 5]
    });
  });

  // - Detalle por búsqueda (nuevo orden)
  contenido.push({
    text: "\n- Detalle por búsqueda",
    style: "sectionHeader"
  });

  búsquedas.forEach(b => {

    contenido.push({
      text: `\n${b.nombre}`,
      style: "subHeader"
    });

    const fs = fuentes.filter(f => b.fuentes.includes(f.codigo));

    contenido.push({
      table: {
        widths: ["25%", "15%", "15%", "15%", "30%"],
        body: [
          ["Título", "País", "Tipo", "Código", "Descripción"],
          ...fs.map(f => [
            f.titulo,
            f.pais,
            f.tipo,
            f.codigo,
            f.descripcion || ""
          ])
        ]
      },
      layout: "lightHorizontalLines",
      margin: [0, 10, 0, 10]
    });
  });

  // 3. Fuentes utilizadas (nuevo orden)
  contenido.push({
    text: "\n- Fuentes utilizadas",
    style: "sectionHeader"
  });

  const todasFuentes = [];

  búsquedas.forEach(b => {
    const fs = fuentes.filter(f => b.fuentes.includes(f.codigo));
    fs.forEach(f => todasFuentes.push(f));
  });

  contenido.push({
    ul: todasFuentes.map(f => `${f.titulo} (${f.pais} — ${f.tipo})`)
  });

  // 4. Observaciones finales
  contenido.push({
    text: "\n- Observaciones finales",
    style: "sectionHeader"
  });

  contenido.push({
    text: "Este informe fue generado automáticamente por el módulo de Listas de Informados de Compliance One. Donde las 'Similitudes' y 'Similitudes inversas' se encuentran parametrizadas en 90%",
    margin: [0, 5, 0, 5]
  });

  // Documento PDF
  const docDefinition = {
    content: contenido,
    styles: {
      sectionHeader: {
        fontSize: 16,
        bold: true,
        color: "#0056b3",
        margin: [0, 10, 0, 10]
      },
      subHeader: {
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5]
      }
    }
  };

  pdfMake.createPdf(docDefinition).download("informeLDI_CO.pdf");
}
