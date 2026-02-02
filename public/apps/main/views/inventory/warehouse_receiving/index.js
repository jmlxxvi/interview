import { log } from '../../../../../js/log.js'
import { $ } from '../../../../../js/dom.js'
import { backendRpc } from '../../../../../js/backend.js'
import { AlertBox, ConfirmBox } from '../../../../../components/Modal/Dialogs.js'
import { ProductSelect } from '../../../../../components/apps/Factory/ProductSelect.js'

const logContext = 'INVENTORY:WAREHOUSE_RECEIVING'

let selectedProductId = null
let selectedProductName = null
let selectedProductCode = null
let selectedVendorId = null
let selectedVendorName = null
let selectedVendorCode = null

const productSelect = $('#invrcv__product')
const productSelectButton = $('#invrcv__select_product')
const typeSelect = $('#invrcv__type')
const lotCodeInput = $('#invrcv__lot_code')
const quantityInput = $('#invrcv__quantity')
const locationSelect = $('#invrcv__location')
const expirationInput = $('#invrcv__expiration')
const manufacturingInput = $('#invrcv__manufacturing')
const priceInput = $('#invrcv__price')
const currencySelect = $('#invrcv__currency')
const submit = $('#invrcv__submit')
const clearBtn = $('#invrcv__clear')

clearBtn.addEventListener('click', () => {
  productSelect.innerHTML = 'No product selected'
  typeSelect.value = 'RAW'
  lotCodeInput.value = ''
  quantityInput.value = ''
  locationSelect.value = ''
  expirationInput.value = ''
  manufacturingInput.value = ''
  priceInput.value = ''
  currencySelect.value = 'USD'
})

const productSelectComponent = ProductSelect({
  onSelect: async (bomId, selectedProduct) => {
    console.log('selectedProduct: productSelect ', selectedProduct)

    selectedProductId = selectedProduct.id
    selectedProductName = selectedProduct.name
    selectedProductCode = selectedProduct.code
    selectedVendorId = selectedProduct.vendorId
    selectedVendorName = selectedProduct.vendorName
    selectedVendorCode = selectedProduct.vendorCode

    // productSelect.innerHTML = `<app-item-code code="${selectedProductCode}">${selectedProductName}</app-item-code>`
    productSelect.innerHTML = `
      <div class="hstack">
        <app-item-code class="mr-3" code="${selectedProductCode}">${selectedProductName}</app-item-code>
        <app-item-code code="${selectedVendorCode}">${selectedVendorName}</app-item-code>
      </div>`

    quantityInput.nextElementSibling.textContent = selectedProduct.unitOfMeasureCode || ''
  }
  // excludeProductId: productId
})

productSelectButton.addEventListener('click', (event) => {
  event.preventDefault()

  productSelectComponent.open()
})

submit.action = async () => {
  const productId = selectedProductId
  const type = typeSelect.value
  const lotCode = lotCodeInput.value.trim()
  const quantity = quantityInput.value
  const locationId = locationSelect.value

  // Validation
  if (!productId) {
    AlertBox('Please select a product.', 'error')
    return
  }

  if (!type) {
    AlertBox('Please select an inventory type.', 'error')
    return
  }

  if (!lotCode) {
    AlertBox('Please enter a lot code.', 'error')
    return
  }

  if (!quantity || parseFloat(quantity) <= 0) {
    AlertBox('Please enter a valid quantity.', 'error')
    return
  }

  if (!locationId) {
    AlertBox('Please select a destination location.', 'error')
    return
  }

  if (!expirationInput.timestampMilliseconds) {
    AlertBox('Please select an expiration date.', 'error')
    return
  }

  if (!selectedVendorId) {
    AlertBox('Please select a vendor.', 'error')
    return
  }

  // Confirmation
  const confirmed = await ConfirmBox(
    `Receive ${quantity} units of the selected product to ${lotCode}?`,
    'confirm'
  )

  if (!confirmed) {
    return
  }

  const response = await backendRpc(
    'app/inventory/warehouse_receiving',
    'receive',
    {
      productId,
      lotId: null, // Will be created if doesn't exist
      lotCode,
      vendorId: selectedVendorId,
      expirationDate: expirationInput.timestampMilliseconds || null,
      manufacturingDate: manufacturingInput.timestampMilliseconds || null,
      quantity: parseFloat(quantity),
      locationId,
      type,
      price: priceInput.value ? parseFloat(priceInput.value) : null,
      currency: currencySelect.value
    }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    AlertBox('Inventory received successfully!', 'success')

    // Clear form
    clearBtn.click()

    // Reload recent receipts table
  }
}

export async function show (params) {
  log('View show', logContext)

  selectedProductId = null
  selectedProductName = null
  selectedProductCode = null
  selectedVendorId = null
  selectedVendorName = null
  selectedVendorCode = null

  // Set default type
  typeSelect.value = 'RAW'

  // Focus on product select
  setTimeout(() => {
    productSelect.focus()
  }, 100)
}

export async function hide () {
  log('View hide', logContext)
}
