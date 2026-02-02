import { log } from '../../../../../../js/log.js'
import { $ } from '../../../../../../js/dom.js'
import { backendRpc } from '../../../../../../js/backend.js'
import { AlertBox, ConfirmBox } from '../../../../../../components/Modal/Dialogs.js'
import { routerNavigate } from '../../../../../../js/router.js'

const logContext = 'INVENTORY:MOVEMENT:EDIT'

let movementId = null

const breadcrumb = $('#invmovedt__breadcrumb')
const movementTypeSelect = $('#invmovedt__movement_type')
const inventoryItemInput = $('#invmovedt__inventory_item')
const quantityInput = $('#invmovedt__quantity')
const sourceLocationSelect = $('#invmovedt__source_location')
const destinationLocationSelect = $('#invmovedt__destination_location')
const workOrderSelect = $('#invmovedt__work_order')
const reasonTextarea = $('#invmovedt__reason')
const submit = $('#invmovedt__submit')
const remove = $('#invmovedt__delete')

remove.addEventListener('click', async () => {
  const confirmed = await ConfirmBox('Are you sure?', 'confirm')
  if (!confirmed) {
    return
  }

  const response = await backendRpc(
    'app/inventory/movement',
    'remove',
    { movementId }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/inventory/movement?reload=true')
  }
})

submit.action = async () => {
  const movementType = movementTypeSelect.value
  const quantity = quantityInput.value

  if (!movementType) {
    AlertBox('Please select a movement type.', 'error')
    return
  }

  if (!quantity || parseFloat(quantity) <= 0) {
    AlertBox('Please enter a valid quantity.', 'error')
    return
  }

  const response = await backendRpc(
    'app/inventory/movement',
    'save',
    {
      inventoryItemId: null, // Not implemented yet
      movementType,
      quantity: parseFloat(quantity),
      workOrderId: workOrderSelect.value || null,
      sourceLocationId: sourceLocationSelect.value || null,
      destinationLocationId: destinationLocationSelect.value || null,
      reason: reasonTextarea.value.trim() || null
    }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/inventory/movement?reload=true')
  }
}

function viewReset () {
  breadcrumb.innerText = 'New movement'
  movementTypeSelect.value = ''
  inventoryItemInput.value = ''
  quantityInput.value = ''
  sourceLocationSelect.value = ''
  destinationLocationSelect.value = ''
  workOrderSelect.value = ''
  reasonTextarea.value = ''
}

export async function show (params) {
  movementId = params.movementId

  log('View show', logContext)

  viewReset()

  if (movementId) {
    breadcrumb.innerText = 'View movement'

    const response = await backendRpc(
      'app/inventory/movement',
      'findById',
      { movementId }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      if (!response.data) {
        AlertBox('Movement not found', 'error')
        routerNavigate('/inventory/movement?reload=true')
        return
      }

      movementTypeSelect.value = response.data.movementType
      movementTypeSelect.disabled = true
      quantityInput.value = response.data.quantity
      quantityInput.disabled = true
      sourceLocationSelect.value = response.data.sourceLocationId || ''
      sourceLocationSelect.disabled = true
      destinationLocationSelect.value = response.data.destinationLocationId || ''
      destinationLocationSelect.disabled = true
      workOrderSelect.value = response.data.workOrderId || ''
      workOrderSelect.disabled = true
      reasonTextarea.value = response.data.reason || ''
      reasonTextarea.disabled = true
      submit.style.display = 'none'
    }
  } else {
    remove.style.display = 'none'
  }
}

export async function hide () {
  log('View hide', logContext)
}
