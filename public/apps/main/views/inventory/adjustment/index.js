import { log } from '../../../../../js/log.js'
import { $ } from '../../../../../js/dom.js'
import { backendRpc } from '../../../../../js/backend.js'
import { AlertBox, ConfirmBox } from '../../../../../components/Modal/Dialogs.js'

const logContext = 'INVENTORY:ADJUSTMENT'

const locationSelect = $('#invadj__location')
const inventoryItemSelect = $('#invadj__inventory_item')
const currentQuantityInput = $('#invadj__current_quantity')
const reservedQuantityInput = $('#invadj__reserved_quantity')
const availableQuantityInput = $('#invadj__available_quantity')
const deltaQuantityInput = $('#invadj__delta_quantity')
const newQuantityInput = $('#invadj__new_quantity')
const reasonTextarea = $('#invadj__reason')
const submit = $('#invadj__submit')
const clearBtn = $('#invadj__clear')

let availableItems = []
let selectedItem = null

// Load inventory items
async function loadInventoryItems (locationId = null) {
  inventoryItemSelect.innerHTML = '<option value="">Loading...</option>'
  inventoryItemSelect.disabled = true

  const response = await backendRpc(
    'app/inventory/adjustment',
    'getInventoryItems',
    { locationId: locationId || null }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
    inventoryItemSelect.innerHTML = '<option value="">Error loading items</option>'
    return
  }

  availableItems = response.data || []

  if (availableItems.length === 0) {
    inventoryItemSelect.innerHTML = '<option value="">No inventory items available</option>'
    return
  }

  // Populate dropdown
  inventoryItemSelect.innerHTML = '<option value="">Select inventory item</option>'
  availableItems.forEach(item => {
    const option = document.createElement('option')
    option.value = item.inventoryItemId
    option.textContent = `${item.productName} (${item.productCode})${item.lotCode ? ' - Lot: ' + item.lotCode : ''} @ ${item.locationName} - Qty: ${parseFloat(item.quantity).toFixed(3)}`
    inventoryItemSelect.appendChild(option)
  })

  inventoryItemSelect.disabled = false
}

// Location filter change
locationSelect.addEventListener('change', () => {
  const locationId = locationSelect.value
  loadInventoryItems(locationId || null)

  // Reset selection
  selectedItem = null
  currentQuantityInput.value = ''
  reservedQuantityInput.value = ''
  availableQuantityInput.value = ''
  deltaQuantityInput.value = ''
  newQuantityInput.value = ''
})

// Update displayed quantities when item is selected
inventoryItemSelect.addEventListener('change', () => {
  const itemId = inventoryItemSelect.value

  if (!itemId) {
    selectedItem = null
    currentQuantityInput.value = ''
    reservedQuantityInput.value = ''
    availableQuantityInput.value = ''
    deltaQuantityInput.value = ''
    newQuantityInput.value = ''
    deltaQuantityInput.disabled = true
    return
  }

  selectedItem = availableItems.find(item => item.inventoryItemId === itemId)

  if (selectedItem) {
    currentQuantityInput.value = parseFloat(selectedItem.quantity).toFixed(3)
    reservedQuantityInput.value = parseFloat(selectedItem.reservedQuantity).toFixed(3)
    availableQuantityInput.value = parseFloat(selectedItem.availableQuantity).toFixed(3)
    deltaQuantityInput.disabled = false
    deltaQuantityInput.focus()
    updateNewQuantity()
  }
})

// Update new quantity preview when delta changes
deltaQuantityInput.addEventListener('input', updateNewQuantity)

function updateNewQuantity () {
  if (!selectedItem || !deltaQuantityInput.value) {
    newQuantityInput.value = ''
    return
  }

  const currentQty = parseFloat(selectedItem.quantity)
  const delta = parseFloat(deltaQuantityInput.value)
  const newQty = currentQty + delta

  if (newQty < 0) {
    newQuantityInput.value = 'ERROR: Cannot be negative'
    newQuantityInput.style.color = 'var(--danger)'
  } else {
    newQuantityInput.value = newQty.toFixed(3)
    newQuantityInput.style.color = delta >= 0 ? 'var(--success)' : 'var(--warning)'
  }
}

clearBtn.addEventListener('click', () => {
  locationSelect.value = ''
  selectedItem = null
  currentQuantityInput.value = ''
  reservedQuantityInput.value = ''
  availableQuantityInput.value = ''
  deltaQuantityInput.value = ''
  deltaQuantityInput.disabled = true
  newQuantityInput.value = ''
  reasonTextarea.value = ''
  loadInventoryItems()
})

submit.action = async () => {
  const inventoryItemId = inventoryItemSelect.value
  const deltaQuantity = deltaQuantityInput.value
  const reason = reasonTextarea.value.trim()

  // Validation
  if (!inventoryItemId) {
    AlertBox('Please select an inventory item.', 'error')
    return
  }

  if (!deltaQuantity || parseFloat(deltaQuantity) === 0) {
    AlertBox('Please enter a non-zero adjustment quantity.', 'error')
    return
  }

  const currentQty = parseFloat(selectedItem.quantity)
  const delta = parseFloat(deltaQuantity)
  const newQty = currentQty + delta

  if (newQty < 0) {
    AlertBox('Adjustment would result in negative inventory. Please check the quantity.', 'error')
    return
  }

  if (!reason) {
    AlertBox('Please provide a reason for this adjustment.', 'error')
    return
  }

  // Confirmation
  const actionWord = delta >= 0 ? 'increase' : 'decrease'
  const confirmed = await ConfirmBox(
    `${actionWord.charAt(0).toUpperCase() + actionWord.slice(1)} ${selectedItem.productName} inventory by ${Math.abs(delta).toFixed(3)} units?\n\nCurrent: ${currentQty.toFixed(3)}\nNew: ${newQty.toFixed(3)}\n\nReason: ${reason}`,
    'confirm'
  )

  if (!confirmed) {
    return
  }

  const response = await backendRpc(
    'app/inventory/adjustment',
    'adjust',
    {
      inventoryItemId,
      deltaQuantity: delta,
      reason
    }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    AlertBox(
      `Inventory adjusted successfully!\n\nPrevious: ${currentQty.toFixed(3)}\nNew: ${response.data.newQuantity.toFixed(3)}`,
      'success'
    )

    // Clear form
    clearBtn.click()
  }
}

export async function show (params) {
  log('View show', logContext)

  // Load all inventory items initially
  await loadInventoryItems()

  // Focus on inventory item select
  setTimeout(() => {
    inventoryItemSelect.focus()
  }, 100)
}

export async function hide () {
  log('View hide', logContext)
}
