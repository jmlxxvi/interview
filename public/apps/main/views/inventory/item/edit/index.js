import { log } from '../../../../js/log.js'
import { $ } from '../../../../js/dom.js'
import { backendRpc } from '../../../../js/backend.js'
import { AlertBox, ConfirmBox } from '../../../../components/Modal/Dialogs.js'
import { routerNavigate } from '../../../../js/router.js'
import '../../../../components/index.js'

const logContext = 'INVENTORY:ITEM:EDIT'

let itemId = null

const productSelect = $('#invitmedt__product')
const typeSelect = $('#invitmedt__type')
const quantityInput = $('#invitmedt__quantity')
const locationSelect = $('#invitmedt__location')
const lotInput = $('#invitmedt__lot')
const vendorSelect = $('#invitmedt__vendor')
const priceInput = $('#invitmedt__price')
const currencySelect = $('#invitmedt__currency')
const expirationInput = $('#invitmedt__expiration')
const submit = $('#invitmedt__submit')
const remove = $('#invitmedt__delete')

// Helper functions for datetime conversion
function unixToDatetimeLocal (unixTimestamp) {
  if (!unixTimestamp) return ''
  const date = new Date(unixTimestamp * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function datetimeLocalToUnix (datetimeLocal) {
  if (!datetimeLocal) return null
  return Math.floor(new Date(datetimeLocal).getTime() / 1000)
}

remove.addEventListener('click', async () => {
  const confirmed = await ConfirmBox('Are you sure?', 'confirm')
  if (!confirmed) {
    return
  }

  const response = await backendRpc(
    'app/inventory/item',
    'remove',
    { itemId }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/inventory/item?reload=true')
  }
})

submit.action = async () => {
  const productId = productSelect.value
  const type = typeSelect.value
  const quantity = quantityInput.value
  const locationId = locationSelect.value

  if (!productId) {
    AlertBox('Please select a product.', 'error')
    return
  }

  if (!type) {
    AlertBox('Please select a type.', 'error')
    return
  }

  if (!quantity || parseFloat(quantity) <= 0) {
    AlertBox('Please enter a valid quantity.', 'error')
    return
  }

  if (!locationId) {
    AlertBox('Please select a location.', 'error')
    return
  }

  const response = await backendRpc(
    'app/inventory/item',
    'save',
    {
      itemId,
      productId,
      lotId: null, // Not implemented yet
      vendorId: vendorSelect.value || null,
      price: priceInput.value ? parseFloat(priceInput.value) : null,
      currency: currencySelect.value,
      quantity: parseFloat(quantity),
      expirationAt: datetimeLocalToUnix(expirationInput.value),
      locationId,
      type
    }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/inventory/item?reload=true')
  }
}

function viewReset () {
  productSelect.value = ''
  typeSelect.value = ''
  quantityInput.value = ''
  locationSelect.value = ''
  lotInput.value = ''
  vendorSelect.value = ''
  priceInput.value = ''
  currencySelect.value = 'USD'
  expirationInput.value = ''
}

export async function show (params) {
  itemId = params.itemId

  log('View show', logContext)

  viewReset()

  if (itemId) {
    const response = await backendRpc(
      'app/inventory/item',
      'findById',
      { itemId }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      if (!response.data) {
        AlertBox('Item not found', 'error')
        routerNavigate('/inventory/item?reload=true')
        return
      }

      productSelect.value = response.data.productId
      typeSelect.value = response.data.type
      quantityInput.value = response.data.quantity
      locationSelect.value = response.data.locationId
      vendorSelect.value = response.data.vendorId || ''
      priceInput.value = response.data.price || ''
      currencySelect.value = response.data.currency || 'USD'
      expirationInput.value = unixToDatetimeLocal(response.data.expirationAt)
    }
  }
}

export async function hide () {
  log('View hide', logContext)
}
