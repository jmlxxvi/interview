// import config from "../../../assets/js/config.js";
import { log } from '../../../../js/log.js'
// import { backendRpc } from '../../js/backend.js'
import { $ } from '../../../../js/dom.js'
import { backendRpc } from '../../../../js/backend.js'
import { AlertBox, ConfirmBox } from '../../../../components/Modal/Dialogs.js'
import { fmanFormatTaxId, fmanFormatTaxIdInput, fmanValidateTaxId } from '../../../../js/fman.js'
import { routerNavigate } from '../../../../js/router.js'
import { isEmail } from '../../../../vendor/validator/lib/isEmail.js'

const logContext = 'ENTITIES:EDIT'

let entityId = null
let op = null

const nodeEntityId = $('#entities_edit__entity_id')
const nodeEntityName = $('#entities_edit__entity_name')
const nodeContactName = $('#entities_edit__contact_name')
const nodeContactEmail = $('#entities_edit__contact_email')
const buttonSubmit = $('#entities_edit__submit')
const buttonRemove = $('#entities_edit__delete')

buttonRemove.addEventListener('click', async () => {
  const confirmed = await ConfirmBox('¿Está seguro que desea eliminar este cliente?', 'confirm')
  console.log('confirmed: ', confirmed)
  if (!confirmed) {
    return
  }

  const response = await backendRpc(
    'backoffice/entities',
    'deleteEntity',
    { entityId }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/entities?reload=true')
  }
})

buttonSubmit.action = async () => {
  if (!nodeEntityId.value || nodeEntityId.value.trim() === '') {
    AlertBox('Por favor ingrese el CUIT.', 'error')
    return
  }

  if (!fmanValidateTaxId(nodeEntityId.value.trim())) {
    AlertBox('Por favor ingrese un CUIT válido.', 'error')
    return
  }

  if (!nodeEntityName.value || nodeEntityName.value.trim() === '') {
    AlertBox('Por favor ingrese el nombre de la entidad.', 'error')
    return
  }

  if (!nodeContactName.value || nodeContactName.value.trim() === '') {
    AlertBox('Por favor ingrese el nombre del contacto.', 'error')
    return
  }

  if (!nodeContactEmail.value || nodeContactEmail.value.trim() === '') {
    AlertBox('Por favor ingrese el email del contacto.', 'error')
    return
  }

  if (!isEmail(nodeContactEmail.value)) {
    AlertBox('Por favor ingrese un email de contacto válido.', 'error')
    return
  }

  console.log('Submitting edit entitiy: ', entityId, nodeEntityName.value, nodeContactName.value, nodeContactEmail.value)

  const response = await backendRpc(
    'backoffice/entities',
    'editEntitySave',
    {
      operation: op,
      entityId,
      entityName: nodeEntityName.value,
      contactName: nodeContactName.value,
      contactEmail: nodeContactEmail.value
    }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/entities?reload=true')
  }
}

function viewReset () {
  nodeEntityId.value = ''
  nodeEntityName.value = ''
  nodeContactName.value = ''
  nodeContactEmail.value = ''
}

nodeEntityId.addEventListener('input', (event) => {
  console.log('event: ', event)
  fmanFormatTaxIdInput(event.target)
  entityId = event.target.value.replace(/\D/g, '')
})

export async function show (params) {
  entityId = params.entityId
  // TODO send information to the backend about this
  log('View show', logContext)

  viewReset()

  if (entityId) {
    op = 'update'
    const response = await backendRpc(
      'backoffice/entities',
      'editEntityData',
      { entityId }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
    // debug.textContent = JSON.stringify(response, null, 2)

      console.log('response', response)

      if (!response.data) {
        AlertBox('Cliente no encontrado', 'error')
        await routerNavigate('/entities')
        return
      }

      nodeEntityId.value = fmanFormatTaxId(response.data.entityId)
      nodeEntityName.value = response.data.entityName
      nodeContactName.value = response.data.contactName
      nodeContactEmail.value = response.data.contactEmail
    }
  } else {
    op = 'insert'
  }
}

export async function hide () {
  log('View hide', logContext)
}
