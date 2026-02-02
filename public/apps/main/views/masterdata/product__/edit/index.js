import { log } from '../../../../js/log.js'
import { $ } from '../../../../js/dom.js'
import { backendRpc } from '../../../../js/backend.js'
import { AlertBox, ConfirmBox, PromptBox } from '../../../../components/Modal/Dialogs.js'
import { routerNavigate } from '../../../../js/router.js'
import { factoryFetchEntityCode } from '../../../../js/factory.js'
import { securitySafeHtml } from '../../../../js/security.js'
import { VendorSelect } from '../../../../components/apps/Factory/VendorSelect.js'
import { ProductSelect } from '../../../../components/'
import { RoutingOperationSelect } from '../../../../components/apps/Factory/RoutingOperationSelect.js'

const logContext = 'MASTERDATA:PRODUCTS:EDIT'

let productId = null

const code = $('#mdaprdedt__code')
const name = $('#mdaprdedt__name')
const description = $('#mdaprdedt__description')
const unitOfMeasure = $('#mdaprdedt__unit_of_measure')
const shelfLifeDays = $('#mdaprdedt__shelf_life_days')
const isOwn = $('#mdaprdedt__is_own')
const submit = $('#mdaprdedt__submit')
const remove = $('#mdaprdedt__delete')
// Tabs
// const tab1 = $('[data-tab="mdaprdedt__tab1"]')
const tab2 = $('[data-tab="mdaprdedt__tab2"]')
const tab3 = $('[data-tab="mdaprdedt__tab3"]')
const tab4 = $('[data-tab="mdaprdedt__tab4"]')
// Vendors tab
const associate = $('#mdaprdedt__vendors_associate')
const vendorsContainer = $('#mdaprdedt__vendors_container')
// BOM tab
const bomAdd = $('#mdaprdedt__bom_add')
const bomContainer = $('#mdaprdedt__bom_container')
// Routing tab
const routingAdd = $('#mdaprdedt__routing_add')
const routingContainer = $('#mdaprdedt__routing_container')

let currentRoutingId = null

// ------
// Routing
// ------

// Operation select for Routing
const operationSelect = RoutingOperationSelect({
  title: 'Select Operation',
  onSelect: async (operationId, equipmentId, qcNeeded) => {
    console.log('operationId, equipmentId, qcNeeded: ', operationId, equipmentId, qcNeeded)
    // Add operation to routing
    const response = await backendRpc(
      'app/masterdata/product',
      'addRoutingOperation',
      { routingId: currentRoutingId, operationId, equipmentId, sequence: 1, requiresQualityControl: qcNeeded }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      await buildRoutingList()
    }
  }
})

routingAdd.addEventListener('click', async (e) => {
  e.preventDefault()

  const version = await PromptBox('Enter routing version', {
    title: 'Add Routing',
    required: true
  })

  if (!version) {
    return
  }

  const response = await backendRpc(
    'app/masterdata/product',
    'createRouting',
    { productId, version }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    await buildRoutingList()
  }
})

// Product select for BOM
const productSelect = ProductSelect({
  onSelect: async (bomId, selectedProduct) => {
    console.log('bomId, selectedProduct: ', bomId, selectedProduct)
    // Add component to BOM
    const response = await backendRpc(
      'app/masterdata/product',
      'addBOMItem',
      { bomId, componentId: selectedProduct.id, quantity: selectedProduct.quantity, unitOfMeasureId: selectedProduct.unitOfMeasureId }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      await buildBOMList()
    }
  },
  excludeProductId: productId
})

// ------
// BOM
// ------

bomAdd.addEventListener('click', async (e) => {
  e.preventDefault()
  // Update excluded product ID before opening
  // productSelect.excludeProductId = productId
  // productSelect.open()
  /*
  {
    title = 'Prompt',
    placeholder = '',
    defaultValue = '',
    confirmText = 'Save',
    cancelText = 'Cancel',
    required = false,
    regex = null,
    validate = null,
    inputType = 'text'
  }
  */
  const version = await PromptBox('Enter BOM version', {
    title: 'Add BOM',
    required: true
  })

  console.log('version: ', version)

  if (!version) {
    return
  }

  const response = await backendRpc(
    'app/masterdata/product',
    'createBOM',
    { productId, version }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    await buildBOMList()
  }
})

// ------
// Vendor
// ------
const vendorSelect = VendorSelect({
  onSelect: async (vendorId) => {
    console.log('Selected vendor: ', vendorId)
    // Handle vendor selection
    const response = await backendRpc(
      'app/masterdata/product',
      'mergeVendor',
      { productId, vendorId }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      await buildVendorsList()
    }
  }
})

associate.addEventListener('click', (e) => {
  e.preventDefault()
  vendorSelect.open()
})

remove.addEventListener('click', async () => {
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

submit.action = async () => {
  if (!code.value || code.value.trim() === '') {
    AlertBox('Please enter a product code.', 'error')
    return
  }

  if (!name.value || name.value.trim() === '') {
    AlertBox('Please enter a product name.', 'error')
    return
  }

  if (!unitOfMeasure.value) {
    AlertBox('Please select a unit of measure.', 'error')
    return
  }

  // Get updated vendor data from DOM
  const vendorsData = getVendorsDataFromDOM()

  // Get updated BOM data from DOM and save
  const bomData = getBOMDataFromDOM()

  // Save BOM items
  for (const bomItem of bomData) {
    if (bomItem.quantity && bomItem.unitOfMeasureId) {
      const responseBOM = await backendRpc(
        'app/masterdata/product',
        'updateBOMItem',
        {
          bomItemId: bomItem.id,
          quantity: bomItem.quantity,
          unitOfMeasureId: bomItem.unitOfMeasureId
        }
      )

      if (responseBOM.status.error) {
        AlertBox('Error updating BOM item: ' + responseBOM.status.message)
        return
      }
    }
  }

  const response = await backendRpc(
    'app/masterdata/product',
    'save',
    {
      productId,
      code: code.value.trim(),
      name: name.value.trim(),
      description: description.value.trim(),
      unitOfMeasureId: unitOfMeasure.value,
      shelfLifeDays: shelfLifeDays.value ? parseInt(shelfLifeDays.value) : null,
      isOwn: isOwn.checked,
      vendorsList: vendorsData
    }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/masterdata/product?reload=true')
  }
}

function viewReset () {
  code.value = ''
  name.value = ''
  description.value = ''
  unitOfMeasure.value = ''
  shelfLifeDays.value = ''
  isOwn.checked = false
  disableSecondaryTabs()
}

function enableSecondaryTabs () {
  tab2.disabled = false
  tab3.disabled = false
  tab4.disabled = false
}

export function disableSecondaryTabs () {
  tab2.disabled = true
  tab3.disabled = true
  tab4.disabled = true
}

function getBOMDataFromDOM () {
  const bomElements = bomContainer.querySelectorAll('[id^="bomItemId_"]')
  const bomData = []

  bomElements.forEach((bomElement) => {
    const bomItemId = bomElement.id.replace('bomItemId_', '')
    const quantityInput = bomElement.querySelector('[id^="mdaprdedt__bom_quantity_"]')
    const uomSelect = bomElement.querySelector('[id^="mdaprdedt__bom_uom_"]')

    bomData.push({
      id: bomItemId,
      quantity: quantityInput && quantityInput.value ? parseFloat(quantityInput.value) : 0,
      unitOfMeasureId: uomSelect ? uomSelect.value : null
    })
  })

  return bomData
}

async function buildBOMList () {
  const responseBOM = await backendRpc('app/masterdata/product', 'getBOM', { productId })

  if (responseBOM.status.error) {
    AlertBox(responseBOM.status.message)
  } else {
    if (!responseBOM.data) {
      AlertBox(responseBOM.status.message, 'error')
      routerNavigate('masterdata/product?reload=true')
      return
    }

    const boms = responseBOM.data
    bomContainer.innerHTML = ''

    if (boms.length === 0) {
      bomContainer.textContent = 'No components in the bill of materials.'
    } else {
      let html = ''

      for (const bom of boms) {
        html += `<div id="bomItemId_${bom.bomId}" style="border: 1px solid var(--gray-300); padding: 1rem; margin-bottom: 1rem; border-radius: 0.375rem;">
                    <div class="hstack flex-align-center justify-space-between mb-2">
                        <div>Version <h4 class="m-0">${bom.version}</h4></div>
                        <a href="#" class="button link button-sm mdaprdedt__bom_item_add" data-id="${bom.bomId}">Add product</a>
                        <a href="#" class="button link button-sm mdaprdedt__bom_remove" data-id="${bom.bomId}">Remove</a>
                    </div>`

        html += `<div class="row">
          <div class="col-2">Code</div>
          <div class="col-6">Name</div>
          <div class="col-2">Quantity</div>
          <div class="col-2" style="text-align: right;">&nbsp;</div>
        </div>`
        for (const item of bom.items) {
          html += `<div class="row">
                      <div class="col-2">${item.component_code}</div>
                      <div class="col-6">${item.component_name}</div>
                      <div class="col-2">${item.quantity} ${item.unit_of_measure_code}</div>
                      <div class="col-2" style="text-align: right;"><a href="#" class="button link button-sm mdaprdedt__bom_item_remove" data-id="${item.bom_item_id}" data-bom="${bom.bomId}">Remove</a></div>
                    </div>`
        }
        html += '</div>'
      }

      console.log('html: ', html)

      bomContainer.innerHTML = securitySafeHtml(html)
    }
  }
}

async function buildRoutingList () {
  const responseRouting = await backendRpc('app/masterdata/product', 'getRouting', { productId })

  if (responseRouting.status.error) {
    AlertBox(responseRouting.status.message)
  } else {
    if (!responseRouting.data) {
      AlertBox(responseRouting.status.message, 'error')
      routerNavigate('masterdata/product?reload=true')
      return
    }

    const routings = responseRouting.data
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
            const equipmentLabel = op.equipment_name ? `${op.equipment_name} (${op.equipment_code})` : 'No equipment'
            const requiresQc = op.requires_quality_control ? 'Yes' : 'No'
            html += `<div id="routingOpId_${op.routing_operation_id}" class="row">
                      <div class="col-4">${index + 1}. ${op.operation_name} (${op.operation_code})</div>
                      <div class="col-4">${equipmentLabel}</div>
                      <div class="col-2">${requiresQc}</div>
                      <div class="col-2" style="text-align: right;"><a href="#" class="button link button-sm mdaprdedt__routing_operation_remove" data-routing-id="${routing.routingId}" data-id="${op.routing_operation_id}">Remove</a></div>
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
}

function getVendorsDataFromDOM () {
  const vendorElements = vendorsContainer.querySelectorAll('[id^="productVendorId_"]')
  const vendorsData = []

  vendorElements.forEach((vendorElement) => {
    const vendorId = vendorElement.getAttribute('data-vendor-id')
    const productVendorId = vendorElement.id.replace('productVendorId_', '')
    const vendorProductCodeInput = vendorElement.querySelector('[id^="mdaprdedt__vendor_product_code_"]')
    const leadTimeDaysInput = vendorElement.querySelector('[id^="mdaprdedt__lead_time_days_"]')
    const isPreferredSwitch = vendorElement.querySelector('[id^="mdaprdedt__is_preferred_"]')

    vendorsData.push({
      id: productVendorId,
      vendorId,
      vendorProductCode: vendorProductCodeInput ? vendorProductCodeInput.value : '',
      leadTimeDays: leadTimeDaysInput && leadTimeDaysInput.value ? parseInt(leadTimeDaysInput.value) : null,
      isPreferred: isPreferredSwitch ? isPreferredSwitch.checked : false
    })
  })

  return vendorsData
}

async function buildVendorsList () {
  const responseListVendors = await backendRpc('app/masterdata/product', 'listVendors', { productId })

  if (responseListVendors.status.error) {
    AlertBox(responseListVendors.status.message)
  } else {
    if (!responseListVendors.data) {
      AlertBox(responseListVendors.status.message, 'error')
      routerNavigate('masterdata/product?reload=true')
      return
    }

    // Populate vendors tab here
    const vendors = responseListVendors.data
    vendorsContainer.innerHTML = ''

    if (vendors.length === 0) {
      vendorsContainer.textContent = 'No vendors associated with this product.'
    } else {
      let html = ''

      for (const vendor of vendors) {
        html += `<div id="productVendorId_${vendor.id}" data-vendor-id="${vendor.vendorId}" style="border-top: 1px solid var(--gray-300); padding: 1rem 0;">
                    <div class="hstack flex-align-center justify-space-between mb-2">
                        <h4 class="m-0">${vendor.vendorName} (${vendor.vendorCode})</h4>
                        <a href="#" class="button link button-sm mdaprdedt__vendor_product_remove" data-id="${vendor.id}">Remove Vendor</a>
                    </div>
                    <div class="mb-3">
                        <label for="mdaprdedt__vendor_product_code_${vendor.id}" class="form-label">Vendor Product Code</label>
                        <input type="text" class="form-control" id="mdaprdedt__vendor_product_code_${vendor.id}" value="${vendor.vendorProductCode || ''}" placeholder="Enter vendor's code for this product">
                    </div>

                    <div class="mb-3">
                        <label for="mdaprdedt__lead_time_days_${vendor.id}" class="form-label">Lead Time (days)</label>
                        <input type="number" class="form-control" id="mdaprdedt__lead_time_days_${vendor.id}" value="${vendor.leadTimeDays || ''}" min="0" placeholder="Average delivery time in days">
                    </div>


                </div>`
      }

      vendorsContainer.innerHTML = securitySafeHtml(html)
    }
  }
}

// Click handlers for dynamically created elements
document.addEventListener('click', async (e) => {
  if (e.target && e.target.classList.contains('mdaprdedt__vendor_product_remove')) {
    e.preventDefault()
    const productVendorId = e.target.getAttribute('data-id')

    const confirmed = await ConfirmBox('Are you sure you want to remove this vendor from the product?', 'confirm')
    if (!confirmed) {
      return
    }

    const response = await backendRpc(
      'app/masterdata/product',
      'removeVendor',
      { productVendorId }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      await buildVendorsList()
    }
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
      await buildBOMList()
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

    const response = await backendRpc(
      'app/masterdata/product',
      'removeBOMItem',
      { bomId, bomItemId }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      await buildBOMList()
    }
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
      await buildRoutingList()
    }
  }

  if (e.target && e.target.classList.contains('mdaprdedt__routing_operation_add')) {
    e.preventDefault()
    const routingId = e.target.getAttribute('data-id')

    currentRoutingId = routingId
    operationSelect.open()
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
      await buildRoutingList()
    }
  }
})

export async function show (params) {
  productId = params.productId

  log('View show', logContext)

  viewReset()

  if (productId) {
    // Details load
    const response = await backendRpc(
      'app/masterdata/product',
      'findById',
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

      enableSecondaryTabs()

      code.value = response.data.code
      name.value = response.data.name
      description.value = response.data.description || ''
      unitOfMeasure.value = response.data.unitOfMeasureId
      shelfLifeDays.value = response.data.shelfLifeDays || ''
      isOwn.checked = response.data.isOwn
    }

    // Vendors load
    await buildVendorsList()

    // BOM load
    await buildBOMList()

    // Routing load
    await buildRoutingList()
  } else {
    const entityCode = await factoryFetchEntityCode('PRD')
    code.value = entityCode
    console.log('Generated entity code: ', entityCode)
  }
}

export async function hide () {
  log('View hide', logContext)
}
