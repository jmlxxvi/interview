import reportConfig from './config.js'

export function checkYSpace (doc, Y, additionalSpace = 0) {
  if (Y + additionalSpace > doc.page.height - doc.page.margins.bottom) {
    doc.addPage()
    return reportConfig.startY
  } else {
    return Y
  }
}

/**
 * Draws a table with dynamically calculated widths.
 *
 * @param {PDFDocument} doc - PDFKit document instance.
 * @param {number} startY - Starting Y position.
 * @param {string[]} headers - Array of header names.
 * @param {string[][]} data - Array of row arrays.
 * @param {number} padding - Padding inside cells.
 */
export function drawTable (doc, startX, startY, headers, data, padding = reportConfig.tabblePadding) {
  startX = startX || reportConfig.leftStart
  const rowHeight = reportConfig.tableRowHeight || 20

  // 1. Calculate column widths dynamically
  doc.font('Helvetica-Bold').fontSize(12)
  const headerWidths = headers.map(h => doc.widthOfString(h) + padding)

  doc.font('Helvetica').fontSize(10)
  const dataWidths = headers.map((_, i) => {
    const maxWidth = data.reduce((max, row) => {
      const cell = row[i] != null ? String(row[i]) : ''
      return Math.max(max, doc.widthOfString(cell) + padding)
    }, 0)
    return maxWidth
  })

  const columnWidths = headers.map((_, i) =>
    Math.max(headerWidths[i], dataWidths[i])
  )

  // 2. Render headers
  let y = startY
  doc.font('Helvetica-Bold').fontSize(12)
  headers.forEach((header, i) => {
    const x = startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0)
    doc.text(header, x, y, { width: columnWidths[i], continued: false })
  })

  // 3. Render rows
  y += rowHeight
  doc.font('Helvetica').fontSize(10)
  data.forEach(row => {
    y = checkYSpace(doc, y, rowHeight)
    row.forEach((cell, i) => {
      const x = startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0)
      doc.text(String(cell ?? ''), x, y, { width: columnWidths[i], continued: false })
    })
    y += rowHeight
  })

  // Optional: Draw grid lines
  // You can use doc.moveTo().lineTo().stroke() to draw borders if needed

  return y
}
