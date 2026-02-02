import { log } from '../../../../../../js/log.js'
import { $ } from '../../../../../../js/dom.js'
import { backendRpc } from '../../../../../../js/backend.js'
import { AlertBox, ConfirmBox, PromptBox } from '../../../../../../components/Modal/Dialogs.js'
import { routerNavigate } from '../../../../../../js/router.js'
import { factoryFetchEntityCode } from '../../../../../../js/factory.js'
import { securitySafeHtml } from '../../../../../../js/security.js'
import { VendorSelect } from '../../../../../../components/apps/Factory/VendorSelect.js'
import { ProductSelect } from '../../../../../../components/apps/Factory/ProductSelectQty.js'
import { RoutingOperationSelect } from '../../../../../../components/apps/Factory/RoutingOperationSelect.js'
import { uuid } from '../../../../../../js/utils.js'

const logContext = 'MASTERDATA:PRODUCTS:EDIT'

// ---------------
// Globals
// ---------------
let productId = null

// ---------------
// State
// ---------------
const viewState = {
  // Data
  product: {},
  vendors: [],
  boms: [],
  routings: [],
  // Reset
  reset () {
    this.product = {}
    this.vendors = []
    this.boms = []
    this.routings = []
  },
  get productDetailsAreComplete () {
    // We need product and quantity to be set
    return this.product && this.product.name && this.product.unit_of_measure_code
  }
}

// ---------------
// DOM Elements
// ---------------
const elements = {
  productCode: $('#mdaprdedt__code'),
  productName: $('#mdaprdedt__name'),
  description: $('#mdaprdedt__description'),
  unitOfMeasure: $('#mdaprdedt__unit_of_measure'),
  // shelfLifeDays: $('#mdaprdedt__shelf_life_days'),
  isOwn: $('#mdaprdedt__is_own'),
  submit: $('#mdaprdedt__submit'),
  remove: $('#mdaprdedt__delete'),
  vendorsAssociate: $('#mdaprdedt__vendors_associate'),
  vendorsSection: $('#mdaprdedt__vendors_section'),
  vendorsContainer: $('#mdaprdedt__vendors_container'),
  bomAdd: $('#mdaprdedt__bom_add'),
  bomSection: $('#mdaprdedt__bom_section'),
  bomContainer: $('#mdaprdedt__bom_container'),
  routingAdd: $('#mdaprdedt__routing_add'),
  routingSection: $('#mdaprdedt__routing_section'),
  routingContainer: $('#mdaprdedt__routing_container')
}
// ---------------
// Components
// ---------------
// Operation select for Routing
const operationSelect = RoutingOperationSelect({
  title: 'Select Operation',
  onSelect: async (routingId, operationId, operationCode, equipmentId, requiresQualityControl) => {
    console.log('operationId, equipmentId, qcNeeded: ', operationId, equipmentId, requiresQualityControl)
    viewState.routings = viewState.routings.map(routing => {
      if (routing.routingId === routingId) {
        routing.operations.push({
          routingOperationId: uuid(),
          operationId,
          operationCode,
          equipmentId,
          requiresQualityControl
        })
      }
      return routing
    })

    renderRouting()
  }
})

// Product select for BOM
const productSelect = ProductSelect({
  onSelect: async (bomId, selectedProduct) => {
    console.log('selectedProduct: productSelect ', selectedProduct)
    viewState.boms = viewState.boms.map(bom => {
      if (bom.bomId === bomId) {
        bom.items.push({
          bomItemId: uuid(),
          componentId: selectedProduct.id,
          componentCode: selectedProduct.code,
          componentName: selectedProduct.name,
          quantity: selectedProduct.quantity,
          unitOfMeasureId: selectedProduct.unitOfMeasureId,
          unitOfMeasureCode: selectedProduct.unitOfMeasureCode,
          vendorCode: selectedProduct.vendorCode,
          vendorName: selectedProduct.vendorName,
          vendorId: selectedProduct.vendorId
        })
      }
      return bom
    })

    renderProductDefinition()
  },
  excludeProductId: productId
})

const vendorSelect = VendorSelect({
  onSelect: async (vendorId, vendorData) => {
    console.log('vendorData: ', vendorData)
    console.log('Selected vendor: ', vendorId)

    const existingVendor = viewState.vendors.find(v => v.vendorId === vendorId)
    if (!existingVendor) {
      viewState.vendors.push({
        vendorId,
        vendorName: vendorData.name,
        vendorCode: vendorData.code
      })
    } else {
      AlertBox('This vendor is already associated with the product.', 'warning')
    }

    renderVendors()
  }
})

// ---------------
// Event Handlers
// ---------------

// Form input changes
elements.productName.addEventListener('input', (e) => { updateProductField('productName', e.target.value) })
// elements.shelfLifeDays.addEventListener('input', (e) => { updateProductField('shelfLifeDays', e.target.value, parseInt) })
elements.description.addEventListener('input', (e) => { updateProductField('description', e.target.value) })
elements.unitOfMeasure.addEventListener('change', (e) => updateProductField('unitOfMeasureId', e.target.value))

elements.isOwn.addEventListener('change', (e) => {
  viewState.product.isOwn = elements.isOwn.checked
  renderProductDefinition()
})

elements.routingAdd.addEventListener('click', async (e) => {
  e.preventDefault()

  const version = await PromptBox('Enter routing version', {
    title: 'Add Routing',
    required: true
  })

  if (!version) {
    return
  }

  viewState.routings.push({ routingId: uuid(), version, operations: [] })

  renderRouting()
})

elements.bomAdd.addEventListener('click', async (e) => {
  e.preventDefault()

  const version = await PromptBox('Enter BOM version', {
    title: 'Add BOM',
    required: true
  })

  console.log('version: ', version)

  if (!version) {
    return
  }

  viewState.boms.push({ bomId: uuid(), version, items: [] })

  renderProductDefinition()
})

elements.vendorsAssociate.addEventListener('click', (e) => {
  e.preventDefault()
  vendorSelect.open()
})

elements.remove.addEventListener('click', async () => {
  const confirmed = await ConfirmBox('Are you sure you want to delete this product?', 'confirm')
  if (!confirmed) {
    return
  }

  const response = await backendRpc(
    'app/masterdata/product',
    'remove',
    { productId }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/masterdata/product?reload=true')
  }
})

// Click handlers for dynamically created elements
document.addEventListener('click', async (e) => {
  if (e.target && e.target.classList.contains('masproedt__vendor_remove')) {
    console.log('e.target: ', e.target)
    e.preventDefault()
    const productVendorId = e.target.getAttribute('data-id')
    console.log('productVendorId: ', productVendorId)

    const confirmed = await ConfirmBox('Are you sure you want to remove this vendor from the product?', 'confirm')
    if (!confirmed) {
      return
    }

    viewState.vendors = viewState.vendors.filter(v => v.vendorId !== productVendorId)
    renderVendors()
  }

  // BOM

  if (e.target && e.target.classList.contains('mdaprdedt__bom_remove')) {
    e.preventDefault()
    const bomId = e.target.getAttribute('data-id')

    const confirmed = await ConfirmBox('Are you sure you want to remove this BOM?', 'confirm')
    if (!confirmed) {
      return
    }

    const response = await backendRpc(
      'app/masterdata/product',
      'removeBOM',
      { bomId }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      renderProductDefinition()
    }
  }

  if (e.target && e.target.classList.contains('mdaprdedt__bom_item_remove')) {
    e.preventDefault()
    const bomId = e.target.getAttribute('data-bom')
    const bomItemId = e.target.getAttribute('data-id')

    const confirmed = await ConfirmBox('Are you sure you want to remove this component from the BOM?', 'confirm')
    if (!confirmed) {
      return
    }

    viewState.boms = viewState.boms.map(bom => {
      if (bom.bomId === bomId) {
        bom.items = bom.items.filter(item => item.bomItemId !== bomItemId)
      }
      return bom
    })

    renderProductDefinition()
  }

  if (e.target && e.target.classList.contains('mdaprdedt__bom_item_add')) {
    e.preventDefault()
    const bomId = e.target.getAttribute('data-id')

    productSelect.open(bomId)
  }

  // Routing

  if (e.target && e.target.classList.contains('mdaprdedt__routing_remove')) {
    e.preventDefault()
    const routingId = e.target.getAttribute('data-id')

    const confirmed = await ConfirmBox('Are you sure you want to remove this routing?', 'confirm')
    if (!confirmed) {
      return
    }

    const response = await backendRpc(
      'app/masterdata/product',
      'removeRouting',
      { routingId }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      await renderRouting()
    }
  }

  if (e.target && e.target.classList.contains('mdaprdedt__routing_operation_add')) {
    e.preventDefault()
    const routingId = e.target.getAttribute('data-id')

    // currentRoutingId = routingId
    operationSelect.open(routingId)
  }

  if (e.target && e.target.classList.contains('mdaprdedt__routing_operation_remove')) {
    e.preventDefault()
    const routingId = e.target.getAttribute('data-routing-id')
    const routingOperationId = e.target.getAttribute('data-id')

    const confirmed = await ConfirmBox('Are you sure you want to remove this operation from the routing?', 'confirm')
    if (!confirmed) {
      return
    }

    const response = await backendRpc(
      'app/masterdata/product',
      'removeRoutingOperation',
      { routingId, routingOperationId }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      await renderRouting()
    }
  }
})

// ---------------
// Page Actions
// ---------------

function updateProductField (field, value, transformFunc = null) {
  console.log('field, value: ', field, value)
  viewState.product[field] = transformFunc ? transformFunc(value) : value
}

elements.submit.action = async () => {
  // if (!code.value || code.value.trim() === '') {
  //   AlertBox('Please enter a product code.', 'error')
  //   return
  // }

  // if (!name.value || name.value.trim() === '') {
  //   AlertBox('Please enter a product name.', 'error')
  //   return
  // }

  // if (!unitOfMeasure.value) {
  //   AlertBox('Please select a unit of measure.', 'error')
  //   return
  // }

  console.log('State data', JSON.stringify(viewState, null, 2))

  const response = await backendRpc('app/masterdata/product', 'save', viewState)

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/masterdata/product?reload=true')
  }
}

// ---------------
// Renders
// ---------------

function renderProductDetails () {
  elements.productCode.innerText = viewState.product.productCode
  elements.productName.value = viewState.product.productName || ''
  elements.description.value = viewState.product.description || ''
  elements.unitOfMeasure.value = viewState.product.unitOfMeasureId
  // elements.shelfLifeDays.value = viewState.product.shelfLifeDays || ''
  elements.isOwn.checked = viewState.product.isOwn
}

function renderProductDefinition () {
  renderVendors()
  renderBOM()
  renderRouting()
}

function renderBOM () {
  if (!viewState.product.isOwn) {
    elements.bomSection.style.display = 'none'
    return
  } else {
    elements.bomSection.style.display = 'block'
  }

  const bomContainer = elements.bomContainer
  const boms = viewState.boms
  bomContainer.innerHTML = ''

  if (boms.length === 0) {
    bomContainer.textContent = 'No Bill of Materials defined for this product.'
  } else {
    let html = ''

    for (const bom of boms) {
      html += `<div id="bomItemId_${bom.bomId}" style="border: 1px solid var(--gray-300); padding: 1rem; margin-bottom: 1rem; border-radius: 0.375rem;">
                    <div class="hstack flex-align-center justify-space-between mb-2">
                        <div>Version <h4 class="m-0">${bom.version}</h4></div>
                        <a href="#" class="button link button-sm mdaprdedt__bom_item_add" data-id="${bom.bomId}">Add product</a>
                        <a href="#" class="button link button-sm mdaprdedt__bom_remove" data-id="${bom.bomId}">Remove</a>
                    </div>`

      if (bom.items.length === 0) {
        html += '<p class="text-muted ms-3">No components defined</p>'
      } else {
        html += `<div class="row">
          <div class="col-2">Code</div>
          <div class="col-3">Product</div>
          <div class="col-3">Vendor</div>
          <div class="col-2">Quantity</div>
          <div class="col-2" style="text-align: right;">&nbsp;</div>
        </div>`
        for (const item of bom.items) {
          html += `<div class="row">
                      <div class="col-2">${item.componentCode}</div>
                      <div class="col-3">${item.componentName}</div>
                      <div class="col-3">${item.vendorName || 'No vendor'}</div>
                      <div class="col-2">${item.quantity} ${item.unitOfMeasureCode}</div>
                      <div class="col-2" style="text-align: right;"><a href="#" class="button link button-sm mdaprdedt__bom_item_remove" data-id="${item.bomItemId}" data-bom="${bom.bomId}">Remove</a></div>
                    </div>`
        }
      }

      html += '</div>'
    }

    bomContainer.innerHTML = securitySafeHtml(html)
  }
}

function renderRouting () {
  if (!viewState.product.isOwn) {
    elements.routingSection.style.display = 'none'
    return
  } else {
    elements.routingSection.style.display = 'block'
  }

  const routingContainer = elements.routingContainer
  const routings = viewState.routings
  routingContainer.innerHTML = ''

  if (routings.length === 0) {
    routingContainer.textContent = 'No routing defined for this product.'
  } else {
    let html = ''

    for (const routing of routings) {
      html += `<div id="routingId_${routing.routingId}" style="border: 1px solid var(--gray-300); padding: 1rem; margin-bottom: 1rem; border-radius: 0.375rem;">
                    <div class="hstack flex-align-center justify-space-between mb-2">
                        <div>Version <h4 class="m-0">${routing.version}</h4></div>
                        <a href="#" class="button link button-sm mdaprdedt__routing_operation_add" data-id="${routing.routingId}">Add operation</a>
                        <a href="#" class="button link button-sm mdaprdedt__routing_remove" data-id="${routing.routingId}">Remove</a>
                    </div>`

      if (routing.operations && routing.operations.length > 0) {
        html += '<div class="ms-3">'
        html += `<div class="row">
            <div class="col-4">Code</div>
            <div class="col-4">Equipment</div>
            <div class="col-2">Quality</div>
            <div class="col-2" style="text-align: right;">&nbsp;</div>
          </div>`
        routing.operations.forEach((op, index) => {
          const equipmentLabel = op.equipmentName ? `${op.equipmentName} (${op.equipmentCode})` : 'No equipment'
          const requiresQc = op.requiresQualityControl ? 'Yes' : 'No'
          html += `<div class="row">
                      <div class="col-4">${op.operationCode}</div>
                      <div class="col-4">${equipmentLabel}</div>
                      <div class="col-2">${requiresQc}</div>
                      <div class="col-2" style="text-align: right;"><a href="#" class="button link button-sm mdaprdedt__routing_operation_remove" data-routing-id="${routing.routingId}" data-id="${op.routingOperationId}">Remove</a></div>
                    </div>`
        })
        html += '</div>'
      } else {
        html += '<p class="text-muted ms-3">No operations defined</p>'
      }

      html += '</div>'
    }

    routingContainer.innerHTML = securitySafeHtml(html)
  }
}

// Vendor rendering helpers
function renderVendorRow (vendor) {
  return `
    <div class="row">
      <div class="col-10">${vendor.vendorCode}: <strong>${vendor.vendorName}</strong></div>
      <div class="col-2" style="text-align: right;"><a href="#" class="masproedt__vendor_remove" data-id="${vendor.vendorId}">Remove</a></div>
    </div>
  `
}

function renderVendors () {
  if (viewState.product.isOwn) {
    elements.vendorsSection.style.display = 'none'
    return
  } else {
    elements.vendorsSection.style.display = 'block'
  }

  const vendorsContainer = elements.vendorsContainer
  const vendors = viewState.vendors
  console.log('vendors: ', vendors)
  vendorsContainer.innerHTML = ''

  if (vendors.length === 0) {
    vendorsContainer.textContent = 'No vendors associated to this product.'
  } else {
    let html = ''

    for (const vendor of vendors) {
      html += renderVendorRow(vendor)
    }

    vendorsContainer.innerHTML = securitySafeHtml(html)
  }
}

export async function show (params) {
  productId = params.productId

  log('View show', logContext)

  if (productId) {
    // Details load
    const response = await backendRpc(
      'app/masterdata/product',
      'getProductDetails',
      { productId }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      if (!response.data) {
        AlertBox('Product not found', 'error')
        routerNavigate('/masterdata/product?reload=true')
        return
      }

      viewState.product = response.data.product
      viewState.vendors = response.data.vendors
      viewState.boms = response.data.boms
      viewState.routings = response.data.routings

      renderProductDetails()
      renderProductDefinition()
    }
  } else {
    viewState.reset()
    const entityCode = await factoryFetchEntityCode('PRD')
    viewState.product.productCode = entityCode

    renderProductDetails()
    renderProductDefinition()
  }
}

export async function hide () {
  log('View hide', logContext)
}
