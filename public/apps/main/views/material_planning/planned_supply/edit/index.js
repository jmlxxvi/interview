import { log } from '../../../../../../js/log.js'
import { $ } from '../../../../../../js/dom.js'
import { backendRpc } from '../../../../../../js/backend.js'
import { AlertBox, ConfirmBoxYesNo } from '../../../../../../components/Modal/Dialogs.js'
import { routerNavigate } from '../../../../../../js/router.js'
import { eventsDispatch } from '../../../../../../js/events.js'
import { ProductSelect } from '../../../../../../components/apps/Factory/ProductSelect.js'
import { factoryFetchEntityCode } from '../../../../../../js/factory.js'

const logContext = 'MATERIAL_PLANNING:PLANNED_SUPPLY:EDIT'

let plannedSupplyId = null
let plannedSupplyCode = null
const plannedSupplyStatus = null
let selectedProductId = null
let selectedProductName = null
let selectedProductCode = null
let selectedProductUomCode = null
let selectedVendorId = null
let selectedVendorName = null
let selectedVendorCode = null

const elements = {
  breadcrumbTitle: $('#matplsedt__breadcrumb_title'),
  product: $('#matplsedt__product'),
  productSelectButton: $('#matplsedt__select_product'),
  removePlannedSupplyButton: $('#matplsedt__delete'),
  quantity: $('#matplsedt__quantity'),
  sourceType: $('#matplsedt__source_type'),
  sourceCode: $('#matplsedt__source_code'),
  expectedAt: $('#matplsedt__expected_at'),
  plannedCode: $('#matplsedt__code'),
  plannedStatus: $('#matplsedt__status'),
  submit: $('#matplsedt__submit')
}

function renderProductInfo () {
  elements.plannedCode.textContent = plannedSupplyCode

  elements.plannedStatus.style.display = plannedSupplyStatus ? 'inline-block' : 'none'
  elements.plannedStatus.textContent = plannedSupplyStatus || ''

  elements.product.innerHTML = selectedProductCode
    ? `
      <div class="hstack">
        <app-item-code class="mr-3" code="${selectedProductCode}">${selectedProductName}</app-item-code>
        <app-item-code code="${selectedVendorCode}">${selectedVendorName}</app-item-code>
      </div>`
    : 'No product selected'

  elements.quantity.nextElementSibling.textContent = selectedProductUomCode || ''
}

// Components
// TODO we should be able to select own and vendor products, check ProductSelect component
const productSelectComponent = ProductSelect({
  onSelect: async (bomId, selectedProduct) => {
    console.log('selectedProduct: productSelect ', selectedProduct)

    selectedProductId = selectedProduct.id
    selectedProductName = selectedProduct.name
    selectedProductCode = selectedProduct.code
    selectedVendorId = selectedProduct.vendorId
    selectedVendorName = selectedProduct.vendorName
    selectedVendorCode = selectedProduct.vendorCode
    selectedProductUomCode = selectedProduct.unitOfMeasureCode

    renderProductInfo()
  }
  // excludeProductId: productId
})

// Event listeners
elements.productSelectButton.addEventListener('click', (event) => {
  event.preventDefault()

  productSelectComponent.open()
})

// Event listeners
elements.submit.addEventListener('click', savePlannedSupply)
elements.removePlannedSupplyButton.addEventListener('click', deletePlannedSupply)

// Convert date to Unix timestamp (milliseconds)
// function dateToTimestamp (dateString) {
//   if (!dateString) return null
//   return new Date(dateString).getTime()
// }

// // Convert Unix timestamp to date input format (YYYY-MM-DD)
// function timestampToDate (timestamp) {
//   if (!timestamp) return ''
//   const date = new Date(parseInt(timestamp))
//   return date.toISOString().split('T')[0]
// }

async function loadPlannedSupply () {
  if (!plannedSupplyId) return

  elements.breadcrumbTitle.textContent = 'Edit'
  //   elements.removePlannedSupplyButton.style.display = 'block'

  const response = await backendRpc(
    'app/material_planning/planned_supply',
    'findById',
    { plannedSupplyId }
  )

  if (response.error) {
    AlertBox(response.message || 'Error loading planned supply', 'error')
    return
  }

  const data = response.data

  // Set form values
  //   elements.product.value = data.productId
  //   elements.vendor.value = data.vendorId
  selectedProductId = data.productId
  selectedVendorId = data.vendorId
  selectedProductName = data.productName
  selectedProductCode = data.productCode
  selectedVendorName = data.vendorName
  selectedVendorCode = data.vendorCode
  selectedProductUomCode = data.unitOfMeasureCode
  plannedSupplyCode = data.code

  renderProductInfo()

  elements.quantity.value = data.quantity
  elements.sourceType.value = data.sourceType
  elements.sourceCode.value = data.sourceCode || ''
  elements.expectedAt.timestampMilliseconds = data.expectedAt
}

async function savePlannedSupply () {
  // Validation
  if (!selectedProductId) {
    AlertBox('Please select a product', 'warning')
    return
  }

  if (!elements.quantity.value || parseFloat(elements.quantity.value) <= 0) {
    AlertBox('Please enter a valid quantity', 'warning')
    return
  }

  if (!elements.sourceType.value) {
    AlertBox('Please select a source type', 'warning')
    return
  }

  if (!elements.expectedAt.value) {
    AlertBox('Please select an expected date', 'warning')
    return
  }

  elements.submit.loading = true

  const payload = {
    id: plannedSupplyId || null,
    productId: selectedProductId,
    vendorId: selectedVendorId,
    quantity: parseFloat(elements.quantity.value),
    sourceType: elements.sourceType.value,
    sourceCode: elements.sourceCode.value || null,
    expectedAt: elements.expectedAt.timestampMilliseconds
  }

  const response = await backendRpc(
    'app/material_planning/planned_supply',
    'save',
    payload
  )

  elements.submit.loading = false

  if (response.error) {
    AlertBox(response.message || 'Error saving planned supply', 'error')
    return
  }

  //   AlertBox(plannedSupplyId ? 'Planned supply updated successfully' : 'Planned supply created successfully', 'success')
  eventsDispatch('event-table-data-changed', { table: 'planned_supply' })
  routerNavigate('/material_planning/planned_supply')
}

async function deletePlannedSupply () {
  const confirmed = await ConfirmBoxYesNo(
    'Are you sure you want to delete this planned supply? This action cannot be undone.',
    'Delete Planned Supply'
  )

  if (!confirmed) return

  elements.removePlannedSupplyButton.disabled = true

  const response = await backendRpc(
    'app/material_planning/planned_supply',
    'remove',
    { plannedSupplyId }
  )

  elements.removePlannedSupplyButton.disabled = false

  if (response.error) {
    AlertBox(response.message || 'Error deleting planned supply', 'error')
    return
  }

  //   AlertBox('Planned supply deleted successfully', 'success')
  eventsDispatch('event-table-data-changed', { table: 'planned_supply' })
  routerNavigate('/material_planning/planned_supply')
}

export async function show (params) {
  log('View show', logContext)

  plannedSupplyId = params.plannedSupplyId || null

  if (plannedSupplyId) {
    elements.removePlannedSupplyButton.style.visibility = 'visible'
    elements.breadcrumbTitle.textContent = 'Edit Planned Supply'
    await loadPlannedSupply()
  } else {
    elements.removePlannedSupplyButton.style.visibility = 'hidden'
    elements.breadcrumbTitle.textContent = 'New Planned Supply'
    plannedSupplyCode = await factoryFetchEntityCode('PLS')
    renderProductInfo()
  }
}

export async function hide () {
  log('View hide', logContext)
}
