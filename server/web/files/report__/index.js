import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'

import reportConfig from './config.js'

import { reportFormArca } from './forms.js'

async function drawHeader (doc) {
  // --- HEADER SECTION ---
  // const logoPath = path.join(process.cwd(), 'public', 'logo.png') // change path as needed
  const logoPath = 'public/images/logo64.png'
  const companyName = 'Fisco Manager'
  // const date = new Date().toLocaleDateString()

  // Generate QR code (data can be anything: URL, text, etc.)
  const qrData = 'https://doctotech.com/report/12345' // Example data
  const qrDataUrl = await QRCode.toDataURL(qrData)

  const headerY = 15 // vertical position for the header
  // Add an image (optional)
  // doc.image('public/images/logo64.png', { width: 64, align: 'center' })
  doc.image(logoPath, 25, headerY, { align: 'center' })

  // Company name next to logo
  doc
    .fontSize(reportConfig.fontSizeTitle)
    .font(reportConfig.fontBold)
    .text(companyName, 100, headerY + 15)

  doc
    .fontSize(reportConfig.fontSizeSubtitle)
    .font(reportConfig.font)
    .text('Reporte general', 100, headerY + 45)

  // Date on the right
  // const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
  // doc.fontSize(12).font('Helvetica').text(date, 0, headerY + 15, {
  //   align: 'right',
  //   width: pageWidth
  // })

  // QR code on the far right below the date (adjust size/position)
  doc.image(qrDataUrl, doc.page.width - 100, headerY, { fit: [60, 60] })

  // Optional: horizontal line below header
  doc.moveTo(30, headerY + 75).lineTo(doc.page.width - 30, headerY + 75).stroke()
}

// Draw the footer (copyright, date)
function drawFooter (doc) {
  const footerText = 'Copyright 2025 Fisco Manager'
  const footerY = doc.page.height - 50 // 50 units from bottom
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right

  doc.fontSize(reportConfig.fontSizeFooter).font(reportConfig.fontItalic).text(footerText, 0, footerY, {
    align: 'center',
    width: pageWidth
  })
}

export async function filesEntityReport (res, entityId, token) {
  // Set the right headers for download
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    'inline; filename="report.pdf"' // inline - attachment
  )

  const startY = reportConfig.startY

  // Create a new PDF document
  const doc = new PDFDocument({ size: 'A4', margin: reportConfig.margin })

  let y = startY

  // Pipe directly to the response
  doc.pipe(res)

  // Draw header on the first page
  await drawHeader(doc)
  drawFooter(doc)

  y = await reportFormArca(y, doc, entityId)

  console.log('y: ', y)

  // Listen for new pages
  doc.on('pageAdded', () => {
    console.log('New page added-----------------')
    drawHeader(doc)
    drawFooter(doc)
  })

  // Add some content
  // doc.fontSize(20).text('Hello PDFKit!', { align: 'center' })
  // doc.moveDown()
  // doc.fontSize(12).text(
  //   'This PDF was created on the fly and streamed directly to your browser.'
  // )

  // Add multiple pages
  // doc.addPage().fontSize(14).text('Second page content.')

  // Finalize the PDF and end the stream
  doc.end()
}
