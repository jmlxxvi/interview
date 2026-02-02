// import config from "../../../assets/js/config.js";
import { log } from '../../../js/log.js'
// import { backendRpc } from '../../js/backend.js'
import { $ } from '../../../js/dom.js'
import { backendRpc } from '../../../js/backend.js'
import { AlertBox } from '../../../components/Modal/Dialogs.js'
import { eventsDispatch } from '../../../js/events.js'

const logContext = 'CUSTOMERS:LOAD'

const taxIds = $('#customers_load__tax_ids')
// const debug = $('#customers_load__debug')
const loadResults = $('#customers_load__results')

$('#customers_load__submit').action = async () => {
//   console.log('taxIds.value: ', taxIds.value)

  const cuits = taxIds.value

  if (!cuits || cuits.trim() === '') {
    AlertBox('Por favor ingrese al menos un CUIT.')
    return
  }

  // Split by commas or newlines (\r\n for Windows, \n for Unix)
  const cuitsArray = taxIds.value
    .split(/[\n\r]+/) // regex: split by newline (Windows/Unix) or comma
    .map(item => item.split(/,/).map(item => item.trim())) // remove non-numeric characters
    // .map(item => item.trim()) // remove extra spaces
    // .map(item => item.replace(/\D/g, '')) // remove non-numeric characters
    // .filter(item => item !== '') // remove empty strings
    // .map(Number) // convert to numbers

  console.log(cuitsArray)
  const response = await backendRpc(
    'app/customers',
    'load',
    cuitsArray
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    // debug.textContent = JSON.stringify(response, null, 2)

    let html = ''
    if (response.data.ok.length > 0) {
      html += `<h4 class="m-2">Se cargaron ${response.data.ok.length} CUITs.</h4>`
    } else {
      html += '<h4 class="m-2">No se cargaron CUITs.</h4>'
    }
    if (response.data.warnings.length > 0) {
      html += '<h4 class="m-2">Advertencias:</h4>'
      response.data.warnings.forEach(item => {
        html += `<div class="mb-2 ml-3">${item.taxId} - ${item.message}</div>`
      })
    }
    if (response.data.errors.length > 0) {
      html += '<h4 class="m-2">Errores:</h4>'
      response.data.errors.forEach(item => {
        html += `<div class="mb-2 ml-3">${item.taxId} - ${item.message}</div>`
      })
    }
    loadResults.innerHTML = html

    eventsDispatch('event-table-data-changed', {
      table: 'customers'
    })
  }
}

function viewReset () {
  taxIds.value = ''
  loadResults.innerHTML = ''
}

export async function show (params) {
  // TODO send information to the backend about this
  log('View show', logContext)

  viewReset()
}

export async function hide () {
  log('View hide', logContext)
}
