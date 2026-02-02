import reportConfig from './config.js'

import { i18nUnixToDate } from '../../../platform/i18n/index.js'

import { entityFormsData } from '../../../../api/routes/shared/reports/entity/index.js'

import { drawTable } from './utils.js'

function compareDateWithToday (dateString) {
  // Parse the input date string (dd-mm-yyyy)
  const [day, month, year] = dateString.split('-').map(Number)

  // Create Date object from the input (months are 0-indexed in JavaScript)
  const inputDate = new Date(year, month - 1, day)

  // Get today's date (set time to 00:00:00 for accurate comparison)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Compare the dates
  if (inputDate < today) {
    return 'earlier'
  } else if (inputDate > today) {
    return 'later'
  } else {
    return 'same'
  }
}

export async function reportFormArca (Y, doc, entityId) {
  const response = await entityFormsData(entityId, 'arca')
  console.log('response: ', response)

  doc.fontSize(reportConfig.fontSizeSection).font(reportConfig.font).text('ARCA', reportConfig.leftStart, Y)

  Y += 20

  if (response) {
    const data = response.formData
    const createdBy = response.createdBy
    const createdAt = response.createdAt
    // doc.fontSize(reportConfig.fontSizeSubsection).font(reportConfig.font).text(JSON.stringify(data), reportConfig.leftStart, Y)

    // Line 1
    let text = data.nombre_empresa

    doc
      .fontSize(reportConfig.fontSizeContents)
      .font(reportConfig.fontBold)
      .text(text, reportConfig.leftStart, Y)

    let textWidth = doc.widthOfString(text) + reportConfig.spacer
    let textHeight = doc.heightOfString(text) + reportConfig.spacer

    text = `(${data.cuit})`

    doc
      .fontSize(reportConfig.fontSizeContents)
      .font(reportConfig.fontBold)
      .fillColor(reportConfig.fontColorLight)
      .text(text, reportConfig.leftStart + textWidth, Y)

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
    doc
      .fontSize(reportConfig.fontSizeFooter)
      .font(reportConfig.fontItalic)
      .text(`${createdBy} ${i18nUnixToDate(createdAt)}`, 0, Y, {
        align: 'right',
        width: pageWidth
      })

    // Line 2
    Y += textHeight

    text = `Válido desde ${data.vigencia_desde} hasta`

    doc
      .fontSize(reportConfig.fontSizeContents)
      .font(reportConfig.font)
      .fillColor(reportConfig.fontColorNormal)
      .text(text, reportConfig.leftStart, Y)

    textWidth = doc.widthOfString(text) + reportConfig.spacer
    textHeight = doc.heightOfString(text) + reportConfig.spacer

    const fillColor = compareDateWithToday(data.vigencia_hasta) === 'earlier' ? reportConfig.fontColorError : reportConfig.fontColorNormal

    text = data.vigencia_hasta

    doc
      .fontSize(reportConfig.fontSizeContents)
      .font(reportConfig.font)
      .fillColor(fillColor)
      .text(text, reportConfig.leftStart + textWidth, Y)

    // line 3
    Y += textHeight

    text = 'Impuestos'

    doc
      .fontSize(reportConfig.fontSizeContents)
      .font(reportConfig.font)
      .fillColor(reportConfig.fontColorNormal)
      .text(text, reportConfig.leftStart, Y)

    textHeight = doc.heightOfString(text) + reportConfig.spacer

    // line 4

    Y += textHeight

    // drawTable
    const headers = ['Nombre', 'Período']
    const rows = data.impuestos.map(imp => [
      imp.nombre,
      imp.periodo
    ])

    Y = drawTable(doc, reportConfig.leftStart + 10, Y, headers, rows)

    drawTable(doc, reportConfig.leftStart + 10, Y, headers, rows)
  } else {
    doc.fontSize(reportConfig.fontSizeSubsection).font(reportConfig.font).text('No se encontraron datos', reportConfig.leftStart, Y)
  }

  return Y
}
