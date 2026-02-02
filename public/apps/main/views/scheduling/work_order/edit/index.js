import { log } from '../../../../js/log.js'
import { $ } from '../../../../js/dom.js'
import { AddBatch } from './components/Batches.js'
import { AddOperation } from './components/Operations.js'
import { ProductSelectSimple } from '../../../../components/apps/Factory/ProductSelectSimple.js'
import { factoryFetchEntityCode } from '../../../../js/factory.js'
import { AlertBox, ConfirmBoxYesNo } from '../../../../components/Modal/Dialogs.js'
import { backendRpc } from '../../../../js/backend.js'
// import { i18nUnixToDate } from '../../../../js/i18n.js'
import { eventsDispatch } from '../../../../js/events.js'
import { routerNavigate } from '../../../../js/router.js'
import { formatSnakeCaseToTitle, timestamp, uuid } from '../../../../js/utils.js'
// import { i18nNumberFormat } from '../../../../js/i18n.js'
import { preciseRound } from '../../../../js/math.js'
import { EditSelectedLots } from './components/Lots.js'
import { i18nUnixToDate } from '../../../../js/i18n.js'

const logContext = 'SCHEDULING:WORK_ORDER:EDIT'

// ---------------
// Globals
// ---------------
let workOrderId = null

// ---------------
// State
// ---------------
const viewState = {
  // Data
  workOrder: {},
  batches: [],
  routings: [],
  boms: [],
  // Reset
  reset () {
    this.workOrder = {}
    this.batches = []
    this.routings = []
    this.boms = []
  },
  // Computed properties
  get batchCount () { return this.batches.length },
  get totalBatchedQuantity () {
    if (!this.batches) return 0
    return this.batches.reduce((sum, batch) => sum + (batch.quantity || 0), 0)
  },
  get remainingQuantity () {
    if (!this.workOrder) return 0
    return (this.workOrder.quantity || 0) - this.totalBatchedQuantity
  },
  get orderIsReadyForBatches () { return this.workOrder && this.workOrder.productId && this.workOrder.quantity && this.workOrder.quantity > 0 },
  get orderIsReadyToStart () {
    for (const batch of this.batches) {
      for (const material of batch.materials) {
        if ((material.shortage || 0) > 0) {
          return false
        }
        if (!material.picks || material.picks.length === 0) {
          return false
        }
      }
    }
    return true
  }
}

//
// ---------------
// DOM Elements
// ---------------
const elements = {
  // Buttons
  saveWorkOrderButton: document.getElementById('schworedt__submit'),
  removeWorkOrderButton: document.getElementById('schworedt__delete'),
  addBatchButton: $('#schworedt__add_batch'),
  selectProductButton: $('#schworedt__select_product'),
  // Page sections
  breadcrumb: $('#schworedt__breadcrumb'),
  workOrderCode: $('#schworedt__code'),
  status: $('#schworedt__status'),
  productSelected: $('#schworedt__product'),
  batchList: $('#schworedt__batch_list'),
  // Inputs
  workOrderQuantity: $('#schworedt__quantity'),
  assignedEmployeeSelect: $('#schworedt__assigned_employee'),
  workCenterSelect: $('#schworedt__work_center'),
  plannedStart: $('#schworedt__planned_start'),
  plannedEnd: $('#schworedt__planned_end')
}

// ---------------
// Components
// ---------------

const productSelectComponent = ProductSelectSimple({
  title: 'Select Product',
  onSelect: async () => {
    renderWorkOrderDetails()

    viewState.routings = await getRoutingData(viewState.workOrder.productId)
    viewState.boms = await getBOMData(viewState.workOrder.productId)

    elements.workOrderQuantity.nextElementSibling.textContent = viewState.workOrder.unitOfMeasureCode || '?'

    viewState.batches = []
    renderBatchesList()
  }
})

const addBatchComponent = AddBatch({
  onSave: async () => {
    // Assign operations to the created batch for the selected routing version
    for (const batch of viewState.batches) {
      const route = viewState.routings.filter(r => r.routingId === batch.routingId)[0]
      batch.operations = route.operations.map(op => ({
        id: uuid(),
        ...op
      }))

      const bom = viewState.boms.filter(b => b.bomId === batch.bomId)[0]
      batch.materials = bom.items.map(item => ({
        id: uuid(),
        requiredQuantity: batch.quantity * item.quantity,
        ...item
      }))

      // TODO we are calculating the selection by batch but if there is mote than one batch
      // it will not show the correct remaining quantity because each batch will calculate
      // from the total available stock, not taking into account other batches
      // We should calculate the lot selection for all batches at once
      const selectedLots = await backendRpc('app/scheduling/work_order', 'selectLotsForBatch', {
        materials: batch.materials
      })

      batch.materials.forEach(material => {
        const materialLots = selectedLots.data.filter(item => item.componentId === material.componentId)
        material.picks = materialLots[0]?.picks
        material.shortage = materialLots[0]?.shortage || 0
      })
    }

    console.log('State after adding batch: ')
    console.log(JSON.stringify(viewState, null, 2))

    renderBatchesList()
  },
  onDelete: async (batchId) => {
    // We use local state for the order and save all at the end,
    // but in case of editing an existing order we need to
    // delete any existing batch from the backend
    // to reclaim any reserved inventory
    await backendRpc('app/scheduling/work_order', 'deleteBatch', {
      batchId
    })
    renderBatchesList()
  }
})

const addOperationComponent = AddOperation({
  onSave: async () => {
    renderBatchesList()
  }
})

const editSelectedLotsComponent = EditSelectedLots({
  onSave: async () => {
    renderBatchesList()
  }
})

// ---------------
// Event Handlers
// ---------------

// Static event listeners
elements.addBatchButton.addEventListener('click', addBatch)
elements.selectProductButton.addEventListener('click', selectProduct)

// Form input changes
elements.workOrderQuantity.addEventListener('input', (e) => {
  updateWorkOrderField('quantity', e.target.value, parseFloat)
})
elements.workCenterSelect.addEventListener('change', (e) => updateWorkOrderField('workCenterId', e.target.value))
elements.assignedEmployeeSelect.addEventListener('change', (e) => updateWorkOrderField('assignedEmployeeId', e.target.value))
elements.plannedStart.addEventListener('date-selected', (e) => {
  const timestampMilliseconds = e.detail.timestampMilliseconds
  viewState.workOrder.plannedStart = timestampMilliseconds
})

elements.plannedEnd.addEventListener('date-selected', (e) => {
  const timestampMilliseconds = e.detail.timestampMilliseconds
  viewState.workOrder.plannedEnd = timestampMilliseconds
})

// Dynamic event listeners
document.body.addEventListener('click', (event) => {
  if (event.target.classList.contains('schworedt__batch_edit')) {
    event.preventDefault()
    const batchId = event.target.getAttribute('data-batch-id')
    addBatchComponent.open(viewState, batchId)
  }

  if (event.target.classList.contains('schworedt__operation_edit')) {
    event.preventDefault()
    const batchId = event.target.getAttribute('data-batch-id')
    const operationId = event.target.getAttribute('data-operation-id')
    addOperationComponent.open(viewState, batchId, operationId)
  }

  if (event.target.classList.contains('schworedt__material_edit')) {
    event.preventDefault()
    const batchId = event.target.getAttribute('data-batch-id')
    const materialId = event.target.getAttribute('data-material-id')
    editSelectedLotsComponent.open(viewState, batchId, materialId)
  }
})

// ---------------
// Page Actions
// ---------------

function addBatch (e) {
  e.preventDefault()
  if (!viewState.orderIsReadyForBatches) {
    AlertBox('Please make sure Work Order <strong>product</strong> and <strong>quantity</strong> are set before adding a batch.', 'error')
    return
  }

  addBatchComponent.open(viewState)
}

function selectProduct (e) {
  e.preventDefault()
  productSelectComponent.open(viewState)
}

function updateWorkOrderField (field, value, transformFunc = null) {
  viewState.workOrder[field] = transformFunc ? transformFunc(value) : value
}

async function getRoutingData (productId) {
  const responseGetRouting = await backendRpc('app/masterdata/product', 'getRouting', {
    productId
  })

  if (!responseGetRouting.status.error) {
    return responseGetRouting.data
  } else {
    log('Error fetching routing data for productId ' + productId, 'getRoutingData', true)
    return []
  }
}

async function getBOMData (productId) {
  const responseGetBOM = await backendRpc('app/masterdata/product', 'getBOM', {
    productId
  })

  if (!responseGetBOM.status.error) {
    return responseGetBOM.data
  } else {
    log('Error fetching BOM data for productId ' + productId, 'getBOMData', true)
    return []
  }
}

// ---------------
// Renders
// ---------------

function renderWorkOrderDetails () {
  elements.workOrderCode.innerText = viewState.workOrder.code || ''
  elements.workOrderQuantity.value = viewState.workOrder.quantity || ''
  elements.workOrderQuantity.nextElementSibling.textContent = viewState.workOrder.unitOfMeasureCode || ''
  elements.productSelected.innerHTML = viewState.workOrder.productId
    ? `<app-item-code code="${viewState.workOrder.productCode}">${viewState.workOrder.productName}</app-item-code>`
    : 'No product selected'
  elements.workCenterSelect.value = viewState.workOrder.workCenterId || ''
  elements.assignedEmployeeSelect.value = viewState.workOrder.assignedEmployeeId || ''
  // Planned Start/End
  elements.plannedStart.timestampMilliseconds = viewState.workOrder.plannedStart
  elements.plannedEnd.timestampMilliseconds = viewState.workOrder.plannedEnd

  if (workOrderId) {
    elements.status.label = formatSnakeCaseToTitle(viewState.workOrder.status) || 'UNKNOWN'
    elements.status.style.display = 'inline-block'
  } else {
    elements.status.style.display = 'none'
  }
}

function renderOperationRow (batchId, operation) {
  return `
    <div class="row">
      <div class="col-3">
        <app-item-code code="${operation.operationCode}">${operation.operationName}</app-item-code>
      </div>
      <div class="col-1">${viewState.workOrder.code || ''}</div>
      <div class="col-4">${operation.equipmentName || ''}</div>
      <div class="col-2">${operation.requiresQualityControl ? 'Yes' : 'No'}</div>
      <div class="col-2" style="text-align: right;"><a href="#" class="schworedt__operation_edit" data-batch-id="${batchId}" data-operation-id="${operation.routingOperationId}">Edit</a></div>
    </div>
  `
}

function renderMaterialLotsField (batch, material) {
  let html = ''

  const { unitOfMeasureCode } = material

  let accumulatedLotQuantity = 0
  const materialRequiredQuantity = preciseRound(material.quantity * batch.quantity)

  // Inventory lots
  if (material.picks?.length > 0) {
    for (const pick of material.picks || []) {
      html += '<div class="vstack mb-1">'

      const { lotCode, expirationAt, pickQty } = pick

      accumulatedLotQuantity += preciseRound(pickQty)

      html += `<div><strong>${lotCode || ''}</strong></div>`
      html += `<div style="font-size: smaller; color: var(--gray-600);">${preciseRound(pickQty)} ${unitOfMeasureCode || ''}</div>`
      html += `<div style="font-size: smaller; color: var(--gray-600);">${expirationAt ? `(Expires: ${i18nUnixToDate(expirationAt, false)})` : ''}</div>`
      html += '</div>'
    }
  } else {
    html += '<app-badge label="No inventory" type="info"></app-badge>'
  }

  // Planned lots
  if (material.plans?.length > 0) {
    for (const plan of material.plans || []) {
      html += '<div class="vstack mb-1">'

      const { sourceCode, sourceType, expectedAt, pickQty } = plan

      accumulatedLotQuantity += preciseRound(pickQty)

      html += `<div><app-item-code code="${formatSnakeCaseToTitle(sourceType)}">${sourceCode}</app-item-code></div>`
      html += `<div style="font-size: smaller; color: var(--gray-600);">${preciseRound(pickQty)} ${unitOfMeasureCode || ''}</div>`
      html += `<div style="font-size: smaller; color: var(--gray-600);">${expectedAt ? `(Available: ${i18nUnixToDate(expectedAt, false)})` : ''}</div>`
      html += '</div>'
    }
  } else {
    // html += '<app-badge label="No planned supplies" type="info"></app-badge>'
    html += ''
  }

  // if (material.shortage && material.shortage > 0) {
  if (preciseRound(accumulatedLotQuantity) < materialRequiredQuantity) {
    html += `<div><app-badge label="Shortage: ${preciseRound(materialRequiredQuantity - accumulatedLotQuantity)} ${unitOfMeasureCode || ''}" type="warning"></app-badge></div>`
    // html += `<div><app-badge label="Shortage: ${preciseRound(material.shortage)} ${unitOfMeasureCode || ''}" type="warning"></app-badge></div>`
  }

  // if (material.shortage && material.shortage > 0) {
  // if (accumulatedLotQuantity < preciseRound(material.quantity * batch.quantity)) {
  //   html += `<div><app-badge label="Shortage: ${preciseRound(preciseRound(material.quantity * batch.quantity) - accumulatedLotQuantity)} ${unitOfMeasureCode || ''}" type="warning"></app-badge></div>`
  //   // html += `<div><app-badge label="Shortage: ${preciseRound(material.shortage)} ${unitOfMeasureCode || ''}" type="warning"></app-badge></div>`
  // }

  return html
}

function renderMaterialRow (batch, material) {
  return `
    <div class="row">
      <div class="col-3">
        <app-item-code code="${material.componentCode}">${material.componentName}</app-item-code>
      </div>
      <div class="col-3">
        <app-item-code code="${material.vendorCode}">${material.vendorName}</app-item-code>
      </div>
      <div class="col-2">${preciseRound(material.quantity * batch.quantity)} ${material.unitOfMeasureCode || ''}</div>
      <div class="col-3">
        <div class="vstack">
          ${renderMaterialLotsField(batch, material) || '<span style="color: var(--gray-500)">—</span>'}
        </div>
      </div>
      <div class="col-1" style="text-align: right;"><a href="#" class="schworedt__material_edit" data-batch-id="${batch.id}" data-material-id="${material.id}">Edit</a></div>

    </div>
  `
}

function renderBatchHeader (batch, unitOfMeasureCode) {
  return `
    <div style="border-bottom: 1px solid var(--gray-300);" class="pb-3">
      <div class="row">
        <div class="col-6"><strong>${batch.batchCode}</strong></div>
        <div class="col-6" style="text-align: right;"><a href="#" class="schworedt__batch_edit" data-batch-id="${batch.id}">Edit</a></div>
      </div>
      <div class="row">
        <div class="col-3"><app-item-code code="Quantity">${batch.quantity} ${unitOfMeasureCode}</app-item-code></div>
        <div class="col-3"><app-item-code code="Assigned To">${batch.assignedEmployeeName || 'None'}</app-item-code></div>
        <div class="col-3"><app-item-code code="BOM">${batch.bomVersion || 'None'}</app-item-code></div>
        <div class="col-3"><app-item-code code="Routing">${batch.routingVersion || 'None'}</app-item-code></div>
      </div>
    </div>
  `
}

function renderBatchesList () {
  let html = ''
  elements.batchList.innerHTML = ''

  const batches = viewState.batches
  const unitOfMeasureCode = viewState.workOrder.unitOfMeasureCode || '?'

  batches.forEach((batch, _index) => {
    html += '<div class="border p-3 mb-3">'

    // Header
    html += renderBatchHeader(batch, unitOfMeasureCode)

    // Materials
    html += `
      <div class="row">
        <div class="col-3">Material</div>
        <div class="col-3">Vendor</div>
        <div class="col-2">Quantity</div>
        <div class="col-3">Lot/s</div>
        <div class="col-1">&nbsp;</div>
      </div>
    `
    for (const material of batch.materials) {
      html += renderMaterialRow(batch, material)
    }

    html += '<div style="border-bottom: 1px solid var(--gray-300); padding-bottom: 1rem;"></div>'

    // Routing
    html += `
      <div class="row">
        <div class="col-4">Operation</div>
        <div class="col-4">Equipment</div>
        <div class="col-2">Requires QC</div>
        <div class="col-2">&nbsp;</div>
      </div>
    `
    for (const operation of batch.operations) {
      html += renderOperationRow(batch.id, operation)
    }

    html += '</div>'
  })

  elements.batchList.innerHTML = html
}
// ---------------
// Save Actions
// ---------------

// Save work order

async function saveWorkOrder (status) {
  // Save work order and related entities (batches, operations)
  console.log('Save work order and related entities (batches, operations): ')
  console.log(JSON.stringify(viewState, null, 2))
  const response = await backendRpc('app/scheduling/work_order', 'save', { status, data: viewState })

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    eventsDispatch('event-table-data-changed', { table: 'work_order' })
    routerNavigate('/scheduling/work_order')
  }
}

elements.saveWorkOrderButton.action = async () => {
  // Status
  if (viewState.workOrder.status && !['DRAFT', 'WAITING_FOR_MATERIALS', 'READY_TO_START'].includes(viewState.workOrder.status)) {
    AlertBox(`An order in state ${viewState.workOrder.status} is not editable`, 'error')
    return
  }

  // Product
  if (!viewState.workOrder.productId) {
    AlertBox('Please select a product', 'error')
    return
  }

  // Quantity
  if (!viewState.workOrder.quantity || viewState.workOrder.quantity <= 0) {
    AlertBox('Please enter a valid quantity', 'error')
    return
  }

  // Batches
  if (viewState.batchCount === 0) {
    const response = await ConfirmBoxYesNo('This Work Order is not complete, there are no batches added. Save as draft?', 'Save as draft')
    if (!response) {
      return
    } else {
      await saveWorkOrder('DRAFT')
      return
    }
  }

  if (viewState.totalBatchedQuantity !== viewState.workOrder.quantity) {
    AlertBox(`Total batch quantity (${viewState.totalBatchedQuantity} ${viewState.workOrder.unitOfMeasureCode}) does not match work order quantity (${viewState.workOrder.quantity} ${viewState.workOrder.unitOfMeasureCode})`, 'error')
    return
  }

  // Materials ready
  if (!viewState.orderIsReadyToStart) {
    const response = await ConfirmBoxYesNo('The materials for this work order are not ready.<br>The order won\'t be able to start until all materials are ready.<br>Save it anyway?', 'Not enough materials')
    if (!response) {
      return
    } else {
      await saveWorkOrder('WAITING_FOR_MATERIALS')
      return
    }
  }

  // Dates
  if (!viewState.workOrder.plannedStart) {
    AlertBox('Please select a planned start date', 'error')
    return
  }

  if (!viewState.workOrder.plannedEnd) {
    AlertBox('Please select a planned end date', 'error')
    return
  }

  if (viewState.workOrder.plannedEnd < viewState.workOrder.plannedStart) {
    AlertBox('Planned end date cannot be before planned start date', 'error')
    return
  }

  if (viewState.workOrder.plannedStart < timestamp()) {
    AlertBox('Planned start date cannot be in the past', 'error')
    return
  }

  await saveWorkOrder('READY_TO_START')
}

// Delete work order
elements.removeWorkOrderButton.addEventListener('click', async (e) => {
  e.preventDefault()

  if (!workOrderId) {
    AlertBox('Cannot delete a work order that has not been created yet')
    return
  }

  const confirmed = await ConfirmBoxYesNo('Are you sure you want to delete this work order?', 'Delete Work Order')

  if (!confirmed) {
    return
  }

  const response = await backendRpc('app/scheduling/work_order', 'remove', { workOrderId })

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    eventsDispatch('event-table-data-changed', { table: 'work_order' })
    routerNavigate('/scheduling/work_order?reload=true')
  }
})

// ---------------
// Initial load
// ---------------

async function loadWorkOrder () {
  // breadcrumb.textContent = 'Edit Work Order XXX'
  // viewState.workOrder = {
  //   ...viewState.workOrder,
  //   id: 'wo-1',
  //   code: 'WO-2024-001',
  //   productId: 'prod-1',
  //   productName: 'Product A',
  //   quantity: 500,
  //   workCenterId: 'wc-1',
  //   assignedEmployeeId: 'emp-1',
  //   status: 'DRAFT',
  //   batches: []
  // }

  // const responsex = await backendRpc('app/scheduling/work_order', 'findById', { workOrderId })

  const response = await backendRpc('app/scheduling/work_order', 'getWorkOrderDetails', { workOrderId })

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    viewState.workOrder = response.data.workOrder
    viewState.batches = response.data.batches
    viewState.routings = await getRoutingData(viewState.workOrder.productId)
    viewState.boms = await getBOMData(viewState.workOrder.productId)
  }

  renderWorkOrderDetails()
  renderBatchesList()
}

// ---------------
// Reset view
// ---------------

// ---------------
// Router Events
// ---------------
export async function show (params) {
  log('View show', logContext)

  workOrderId = params.workOrderId || null

  // Load work order data if editing
  if (workOrderId) {
    // TODO we should prevent the work order from being edited if it is not in DRAFT, WAITING_FOR_MATERIALS or READY_TO_START status
    // that means it is already in progress or completed
    // see isEditable field in the repository
    elements.removeWorkOrderButton.style.visibility = 'visible'
    elements.breadcrumb.textContent = 'Edit Work Order'

    await loadWorkOrder()
    renderWorkOrderDetails()
    renderBatchesList()
  } else {
    elements.breadcrumb.textContent = 'New Work Order'
    viewState.reset()
    viewState.workOrder.code = await factoryFetchEntityCode('WOR')
    renderWorkOrderDetails()
    renderBatchesList()
  }
}

export async function hide () {
  log('View hide', logContext)
}
