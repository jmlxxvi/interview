import { log } from '../../../../../js/log.js'
import { $ } from '../../../../../js/dom.js'
import { backendRpc } from '../../../../../js/backend.js'
import { AlertBox, ConfirmBox } from '../../../../../components/Modal/Dialogs.js'
// import { i18nUnixToDate } from '../../../js/i18n.js'
// import { DataTable } from '../../../components/Tables/DataTable.js'

const logContext = 'INVENTORY:WAREHOUSE_TRANSFER'

const sourceLocationSelect = $('#invtrf__source_location')
const inventoryItemSelect = $('#invtrf__inventory_item')
const availableInput = $('#invtrf__available')
const quantityInput = $('#invtrf__quantity')
const destinationLocationSelect = $('#invtrf__destination_location')
const submit = $('#invtrf__submit')
const clearBtn = $('#invtrf__clear')

let availableItems = []
let selectedItem = null

// Load available items when source location changes
sourceLocationSelect.addEventListener('change', async () => {
  const locationId = sourceLocationSelect.value

  // Reset dependent fields
  inventoryItemSelect.innerHTML = '<option value="">Loading...</option>'
  inventoryItemSelect.disabled = true
  availableInput.value = ''
  quantityInput.value = ''
  quantityInput.disabled = true
  selectedItem = null

  if (!locationId) {
    inventoryItemSelect.innerHTML = '<option value="">First select a source location</option>'
    return
  }

  const response = await backendRpc(
    'app/inventory/warehouse_transfer',
    'getAvailableItems',
    { locationId }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
    inventoryItemSelect.innerHTML = '<option value="">Error loading items</option>'
    return
  }

  availableItems = response.data || []

  if (availableItems.length === 0) {
    inventoryItemSelect.innerHTML = '<option value="">No available items at this location</option>'
    return
  }

  // Populate dropdown
  inventoryItemSelect.innerHTML = '<option value="">Select inventory item</option>'
  availableItems.forEach(item => {
    const option = document.createElement('option')
    option.value = item.id
    option.textContent = `${item.productName} (${item.productCode})${item.lotCode ? ' - Lot: ' + item.lotCode : ''} - Available: ${parseFloat(item.availableQuantity).toFixed(3)}`
    inventoryItemSelect.appendChild(option)
  })

  inventoryItemSelect.disabled = false
})

// Update available quantity when item is selected
inventoryItemSelect.addEventListener('change', () => {
  const itemId = inventoryItemSelect.value

  if (!itemId) {
    selectedItem = null
    availableInput.value = ''
    quantityInput.value = ''
    quantityInput.disabled = true
    return
  }

  selectedItem = availableItems.find(item => item.id === itemId)

  if (selectedItem) {
    availableInput.value = parseFloat(selectedItem.availableQuantity).toFixed(3)
    quantityInput.disabled = false
    quantityInput.max = selectedItem.availableQuantity
    quantityInput.focus()
  }
})

clearBtn.addEventListener('click', () => {
  sourceLocationSelect.value = ''
  inventoryItemSelect.innerHTML = '<option value="">First select a source location</option>'
  inventoryItemSelect.disabled = true
  availableInput.value = ''
  quantityInput.value = ''
  quantityInput.disabled = true
  destinationLocationSelect.value = ''
  selectedItem = null
  availableItems = []
  sourceLocationSelect.focus()
})

submit.action = async () => {
  const sourceLocationId = sourceLocationSelect.value
  const inventoryItemId = inventoryItemSelect.value
  const quantity = quantityInput.value
  const destinationLocationId = destinationLocationSelect.value

  // Validation
  if (!sourceLocationId) {
    AlertBox('Please select a source location.', 'error')
    return
  }

  if (!inventoryItemId) {
    AlertBox('Please select an inventory item.', 'error')
    return
  }

  if (!quantity || parseFloat(quantity) <= 0) {
    AlertBox('Please enter a valid quantity.', 'error')
    return
  }

  if (parseFloat(quantity) > parseFloat(selectedItem.availableQuantity)) {
    AlertBox(`Quantity cannot exceed available quantity (${selectedItem.availableQuantity}).`, 'error')
    return
  }

  if (!destinationLocationId) {
    AlertBox('Please select a destination location.', 'error')
    return
  }

  if (sourceLocationId === destinationLocationId) {
    AlertBox('Source and destination locations cannot be the same.', 'error')
    return
  }

  // Get location names for confirmation
  //   const sourceLocationName = sourceLocationSelect.options[sourceLocationSelect.selectedIndex].text
  //   const destinationLocationName = destinationLocationSelect.options[destinationLocationSelect.selectedIndex].text
  const sourceLocationName = sourceLocationSelect.label
  const destinationLocationName = destinationLocationSelect.label

  // Confirmation
  const confirmed = await ConfirmBox(
    `Transfer ${quantity} units of ${selectedItem.productName} from ${sourceLocationName} to ${destinationLocationName}?`,
    'confirm'
  )

  if (!confirmed) {
    return
  }

  const response = await backendRpc(
    'app/inventory/warehouse_transfer',
    'transfer',
    {
      inventoryItemId,
      quantity: parseFloat(quantity),
      destinationLocationId
    }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    AlertBox('Inventory transferred successfully!', 'success')

    // Clear form
    clearBtn.click()
  }
}

export async function show (params) {
  log('View show', logContext)

  // Focus on source location select
  setTimeout(() => {
    sourceLocationSelect.focus()
  }, 100)
}

export async function hide () {
  log('View hide', logContext)
}
