// import config from "../../../assets/js/config.js";
import { log } from '../../../js/log.js'
// import { backendRpc } from '../../js/backend.js'
import { $ } from '../../../js/dom.js'
import { backendRpc } from '../../../js/backend.js'
import { AlertBox, ConfirmBox } from '../../../components/Modal/Dialogs.js'
import { fmanFormatTaxId } from '../../../js/fman.js'
import { routerNavigate } from '../../../js/router.js'
import { isEmail } from '../../../vendor/validator/lib/isEmail.js'

const logContext = 'CUSTOMERS:EDIT'

let customerId = null

const entityName = $('#customers_edit__entity_name')
const entityId = $('#customers_edit__entity_id')
const contactName = $('#customers_edit__contact_name')
const contactEmail = $('#customers_edit__contact_email')
const submit = $('#customers_edit__submit')
const remove = $('#customers_edit__delete')

remove.addEventListener('click', async () => {
  const confirmed = await ConfirmBox('¿Está seguro que desea eliminar este cliente?', 'confirm')
  console.log('confirmed: ', confirmed)
  if (!confirmed) {
    return
  }

  const response = await backendRpc(
    'app/customers',
    'deleteCustomer',
    { customerId }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/customers?reload=true')
  }
})

submit.action = async () => {
  if (!contactName.value || contactName.value.trim() === '') {
    AlertBox('Por favor ingrese el nombre de contacto.', 'error')
    return
  }

  if (!contactEmail.value || contactEmail.value.trim() === '') {
    AlertBox('Por favor ingrese el email de contacto.', 'error')
    return
  }

  if (!isEmail(contactEmail.value)) {
    AlertBox('Por favor ingrese un email de contacto válido.', 'error')
    return
  }

  console.log('Submitting edit customer: ', customerId, contactName.value, contactEmail.value)

  const response = await backendRpc(
    'app/customers',
    'editCustomerSave',
    { customerId, contactName: contactName.value, contactEmail: contactEmail.value }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/customers?reload=true')
  }
}

function viewReset () {
  taxIds.value = ''
  loadResults.innerHTML = ''
}

export async function show (params) {
  customerId = params.customerId
  // TODO send information to the backend about this
  log('View show', logContext)

  const response = await backendRpc(
    'app/customers',
    'find',
    { customerId }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    // debug.textContent = JSON.stringify(response, null, 2)

    console.log('response', response)

    if (!response.data) {
      AlertBox('Cliente no encontrado', 'error')
      await routerNavigate('/customers')
      return
    }

    entityName.innerText = response.data.entityName
    entityId.innerText = fmanFormatTaxId(response.data.entityId)
    contactName.value = response.data.contactName
    contactEmail.value = response.data.contactEmail
  }
}

export async function hide () {
  log('View hide', logContext)
}
