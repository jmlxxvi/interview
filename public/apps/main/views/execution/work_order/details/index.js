import { log } from '../../../../js/log.js'
import { $ } from '../../../../js/dom.js'
import { AlertBox, ConfirmBoxYesNo } from '../../../../components/Modal/Dialogs.js'
import { backendRpc } from '../../../../js/backend.js'
// import { i18nUnixToDate } from '../../../../js/i18n.js'
// import { eventsDispatch } from '../../../../js/events.js'
// import { routerNavigate } from '../../../../js/router.js'
import { formatSnakeCaseToTitle } from '../../../../js/utils.js'
import { routerNavigate } from '../../../../js/router.js'
import { securitySafeHtml } from '../../../../js/security.js'
import { i18nUnixToDate } from '../../../../js/i18n.js'
// import { i18nNumberFormat } from '../../../../js/i18n.js'
// import { preciseRound } from '../../../../js/math.js'

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
  }
  // get allOperationsCompleted () {
  //   for (const batch of this.batches) {
  //     const batchAllOpsCompleted = batch.operations.every(op => op.status === 'COMPLETED')
  //     if (!batchAllOpsCompleted) {
  //       return false
  //     }
  //   }
  //   return true
  // },
  // get qualityControlsPending () {
  //   for (const batch of this.batches) {
  //     for (const qc of batch.qualityControls) {
  //       if (!qc.result) {
  //         return true
  //       }
  //     }
  //   }
  //   return false
  // }
  // Computed properties
  // get batchCount () { return this.batches.length },
  // get totalBatchedQuantity () {
  //   if (!this.batches) return 0
  //   return this.batches.reduce((sum, batch) => sum + (batch.quantity || 0), 0)
  // },
  // get remainingQuantity () {
  //   if (!this.workOrder) return 0
  //   return (this.workOrder.quantity || 0) - this.totalBatchedQuantity
  // },
  // get orderIsReadyForBatches () { return this.workOrder && this.workOrder.productId && this.workOrder.quantity && this.workOrder.quantity > 0 },
  // get orderIsReadyToStart () {
  //   for (const batch of this.batches) {
  //     for (const material of batch.materials) {
  //       if ((material.shortage || 0) > 0) {
  //         return false
  //       }
  //       if (!material.picks || material.picks.length === 0) {
  //         return false
  //       }
  //     }
  //   }
  //   return true
  // }
  // Id of the first batch completed
  // get firstCompletedBatchId () {
  //   for (const batch of this.batches) {
  //     if (batch.status === 'COMPLETED') {
  //       return batch.id
  //     }
  //   }
  //   return null
  // },
  // // Sequence of the last completed batch
  // get lastCompletedBatchSequence () {
  //   let lastSequence = null
  //   for (const batch of this.batches) {
  //     if (batch.status === 'COMPLETED') {
  //       if (lastSequence === null || batch.sequence > lastSequence) {
  //         lastSequence = batch.sequence
  //       }
  //     }
  //   }
  //   return lastSequence
  // }
}

//
// ---------------
// DOM Elements
// ---------------
const elements = {
  // Buttons
  // Page sections
  breadcrumb: $('#exewordet__breadcrumb'),
  workOrderHeader: $('#exewordet__header'),
  workOrderDetails: $('#exewordet__details'),
  // workOrderCode: $('#exewordet__code'),
  // status: $('#exewordet__status'),
  productSelected: $('#exewordet__product'),
  batchList: $('#exewordet__batch_list')
  // Inputs
  // assignedEmployeeSelect: $('#exewordet__assigned_employee'),
  // workCenterSelect: $('#exewordet__work_center'),
  // plannedStart: $('#exewordet__planned_start'),
  // plannedEnd: $('#exewordet__planned_end')
}

// ---------------
// Components
// ---------------

// ---------------
// Event Handlers
// ---------------

// Static event listeners

// Form input changes

// Dynamic event listeners
document.body.addEventListener('click', async (event) => {
  // Work Order
  if (event.target.classList.contains('exewordet__workorder_cancel')) {
    event.preventDefault()

    const workOrderId = event.target.getAttribute('data-workorder-id')

    const answer = await ConfirmBoxYesNo('Are you sure you want to cancel this work order?<br>All batches will be cancelled as well.')

    if (!answer) return

    const response = await backendRpc('app/execution/work_order', 'cancelWorkOrder', {
      workOrderId
    })

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      await loadWorkOrder()
    }

    console.log('response: ', JSON.stringify(response, null, 2))
  }

  // Batches
  if (event.target.classList.contains('exewordet__batch_cancel')) {
    event.preventDefault()

    const batchId = event.target.getAttribute('data-batch-id')

    const answer = await ConfirmBoxYesNo('Are you sure you want to cancel this batch?')

    if (!answer) return

    const response = await backendRpc('app/execution/work_order', 'cancelBatch', {
      workOrderId: viewState.workOrder.id,
      batchId
    })

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      await loadWorkOrder()
    }

    console.log('response: ', JSON.stringify(response, null, 2))
  }

  // Operations
  if (event.target.classList.contains('exewordet__operation_start')) {
    event.preventDefault()
    const batchId = event.target.getAttribute('data-batch-id')
    console.log('batchId: ', batchId)
    const operationId = event.target.getAttribute('data-operation-id')
    console.log('operationId: ', operationId)

    console.log('viewState.workOrder.id: ', viewState.workOrder.id)

    const response = await backendRpc('app/execution/work_order', 'startBatchOperation', {
      workOrderId: viewState.workOrder.id,
      batchId,
      operationId
    })

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      await loadWorkOrder()
    }

    console.log('response: ', JSON.stringify(response, null, 2))
  }

  if (event.target.classList.contains('exewordet__operation_complete')) {
    event.preventDefault()

    const batchId = event.target.getAttribute('data-batch-id')
    const operationId = event.target.getAttribute('data-operation-id')

    const response = await backendRpc('app/execution/work_order', 'completeBatchOperation', {
      workOrderId: viewState.workOrder.id,
      batchId,
      operationId
    })

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      await loadWorkOrder()
    }

    console.log('response: ', JSON.stringify(response, null, 2))
  }

  if (event.target.classList.contains('exewordet__operation_cancel')) {
    event.preventDefault()

    const batchId = event.target.getAttribute('data-batch-id')
    const operationId = event.target.getAttribute('data-operation-id')

    const response = await backendRpc('app/execution/work_order', 'cancelBatchOperation', {
      workOrderId: viewState.workOrder.id,
      batchId,
      operationId
    })

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      await loadWorkOrder()
    }

    console.log('response: ', JSON.stringify(response, null, 2))
  }

  // Quality Control
  if (event.target.classList.contains('exewordet__qc_pass')) {
    event.preventDefault()
    const qualityControlId = event.target.getAttribute('data-quality-control-id')
    console.log('qualityControlId: ', qualityControlId)

    const response = await backendRpc('app/execution/work_order', 'passBatchQualityControl', {
      qualityControlId,
      notes: $('#exewordet__qc_notes').value
    })

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      await loadWorkOrder()
    }

    console.log('response: ', JSON.stringify(response, null, 2))
  }

  if (event.target.classList.contains('exewordet__qc_fail')) {
    event.preventDefault()
    const qualityControlId = event.target.getAttribute('data-quality-control-id')
    console.log('qualityControlId: ', qualityControlId)

    const answer = await ConfirmBoxYesNo('Are you sure you want to fail this quality control?')
    if (!answer) {
      return
    }

    const response = await backendRpc('app/execution/work_order', 'failBatchQualityControl', {
      qualityControlId
    })

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      await loadWorkOrder()
    }

    console.log('response: ', JSON.stringify(response, null, 2))
  }

  // Finish Batch
  if (event.target.classList.contains('exewordet__finish_batch')) {
    event.preventDefault()
    const batchId = event.target.getAttribute('data-batch-id')
    console.log('batchId: ', batchId)

    if (viewState.qualityControlsPending) {
      AlertBox('Cannot finish batch: there are pending quality controls.', 'error')
      return
    }

    const allBatchOperationsCompleted = viewState.batches.find(batch => batch.id === batchId).operations.every(op => op.status === 'COMPLETED')
    if (!allBatchOperationsCompleted) {
      AlertBox('Cannot finish batch: not all operations are completed.', 'error')
      return
    }

    const allBatchQualityControlsPassed = viewState.batches.find(batch => batch.id === batchId).qualityControls.every(qc => qc.result === 'PASS')
    if (!allBatchQualityControlsPassed) {
      AlertBox('Cannot finish batch: not all quality controls have passed.', 'error')
      return
    }

    const response = await backendRpc('app/execution/work_order', 'finishBatch', {
      workOrderId: viewState.workOrder.id,
      batchId
    })

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      await loadWorkOrder()
    }

    console.log('response: ', JSON.stringify(response, null, 2))
  }
})

// ---------------
// Page Actions
// ---------------

// ---------------
// Renders
// ---------------

function renderWorkOrderDetails () {
  // Header
  const workOrderHeader = `
    <div id="exewordet__code" style="font-size: 1.4rem; font-weight: bold;">${viewState.workOrder.code}</div>
    <div class="hstack flex-align-center flex-gap-3">
      <div style="text-align: right;"><app-badge>${formatSnakeCaseToTitle(viewState.workOrder.status)}</app-badge></div>
      <div>
        <app-dropdown position="right" menu-width="200px">
          <button slot="toggle" class="dots-button" aria-label="More options">
            <img src="/images/icons/three-dots-vertical.svg" alt="More options">
          </button>
          <div slot="menu" class="dropdown-menu">
              <a href="#" class="dropdown-item exewordet__workorder_cancel" data-workorder-id="${viewState.workOrder.id}">Cancel Work Order</a>
          </div>
        </app-dropdown>
      </div>
    </div>`

  elements.workOrderHeader.innerHTML = securitySafeHtml(workOrderHeader)

  // Product
  elements.productSelected.innerHTML = viewState.workOrder.productId
    ? `<app-item-code code="${viewState.workOrder.productCode}">${viewState.workOrder.productName} x${viewState.workOrder.quantity} ${viewState.workOrder.unitOfMeasureCode || ''}</app-item-code>`
    : 'No product selected'

  // Details
  // elements.workCenterSelect.innerText = viewState.workOrder.workCenterId || ''
  // elements.assignedEmployeeSelect.innerText = viewState.workOrder.assignedEmployeeId || ''
  // elements.plannedStart.innerText = i18nUnixToDate(viewState.workOrder.plannedStart, false)
  // elements.plannedEnd.innerText = i18nUnixToDate(viewState.workOrder.plannedEnd, false)

  const detailsHtml = `<div class="row">
    <div class="col-3"><app-item-code code="Work Center">${viewState.workOrder.workCenterId || 'None'}</app-item-code></div>
    <div class="col-3"><app-item-code code="Assigned To">${viewState.workOrder.assignedEmployeeId || 'Nobody'}</app-item-code></div>
    <div class="col-3"><app-item-code code="Planned Start">${i18nUnixToDate(viewState.workOrder.plannedStart, false) || 'N/A'}</app-item-code></div>
    <div class="col-3"><app-item-code code="Planned End">${i18nUnixToDate(viewState.workOrder.plannedEnd, false) || 'N/A'}</app-item-code></div>
  </div>`

  // elements.workOrderDetails.innerHTML = securitySafeHtml(detailsHtml)
  elements.workOrderDetails.innerHTML = detailsHtml
}

function renderBatchHeader (batch, unitOfMeasureCode) {
  return `
    <div class="pb-3">
      <div class="hstack flex-align-center">
        <div><strong>${batch.batchCode}</strong></div>
        <div class="hstack flex-align-center flex-gap-3">
          <div style="text-align: right;"><app-badge>${formatSnakeCaseToTitle(batch.status)}</app-badge></div>
          <div>
            <app-dropdown position="right">
              <button slot="toggle" class="dots-button" aria-label="More options">
                <img src="/images/icons/three-dots-vertical.svg" alt="More options">
              </button>
              <div slot="menu" class="dropdown-menu">
                  <a href="#" class="dropdown-item exewordet__batch_cancel" data-batch-id="${batch.id}">Cancel Batch</a>
              </div>
            </app-dropdown>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-3"><app-item-code code="Quantity">${batch.quantity} ${unitOfMeasureCode}</app-item-code></div>
        <div class="col-3"><app-item-code code="Assigned To">${batch.assignedEmployeeName || 'Nobody'}</app-item-code></div>
        <div class="col-3"><app-item-code code="BOM">${batch.bomVersion || 'None'}</app-item-code></div>
        <div class="col-3"><app-item-code code="Routing">${batch.routingVersion || 'None'}</app-item-code></div>
      </div>
    </div>
  `
}

function renderBatchOperationSectionContents (batch, operation) {
  let html = '<div>'

  const startFinishButton = operation.status === 'PENDING'
    ? '<a href="#" class="button link exewordet__operation_start" data-batch-id="' + batch.id + '" data-operation-id="' + operation.batchOperationId + '">Start</a>'
    : '<a href="#" class="button link exewordet__operation_complete" data-batch-id="' + batch.id + '" data-operation-id="' + operation.batchOperationId + '">Complete</a>'

  // Tabs
  html += `
    <div class="hstack flex-align-center">
      <app-badge>${formatSnakeCaseToTitle(operation.status)}</app-badge>
      <div>
        <div class="hstack flex-align-center">
          <div>${startFinishButton}</div>
          <app-dropdown position="right">
            <button slot="toggle" class="dots-button" aria-label="More options">
                <img src="/images/icons/three-dots-vertical.svg" alt="More options">
            </button>
            <div slot="menu" class="dropdown-menu">
                <a href="#" class="dropdown-item ${operation.status === 'RUNNING' ? '' : 'disabled'} exewordet__operation_complete" data-batch-id="${batch.id}" data-operation-id="${operation.batchOperationId}">Complete</a>
            </div>
          </app-dropdown>
        </div>
      </div>
    </div>
    <div>
      ${operation.operationName}
    </div>
  `

  /*
              <div slot="menu" class="dropdown-menu">
                <a href="#" class="dropdown-item ${operation.status === 'PENDING' ? '' : 'disabled'} exewordet__operation_start" data-batch-id="${batch.id}" data-operation-id="${operation.batchOperationId}">Start</a>
                <a href="#" class="dropdown-item ${operation.status === 'RUNNING' ? '' : 'disabled'} exewordet__operation_cancel" data-batch-id="${batch.id}" data-operation-id="${operation.batchOperationId}">Cancel</a>
                <a href="#" class="dropdown-item ${operation.status === 'RUNNING' ? '' : 'disabled'} exewordet__operation_complete" data-batch-id="${batch.id}" data-operation-id="${operation.batchOperationId}">Complete</a>
            </div>
  */

  html += '</div>'

  return html
}

function renderBatchOperationSectionQc (qualityControl) {
  console.log('qualityControl: ', qualityControl)
  const html = `
    <div class="hstack flex-align-center mb-3">
      <app-badge>${formatSnakeCaseToTitle(qualityControl.result) || 'Pending'}</app-badge>
      <div>
      <a href="#" class="button link exewordet__qc_fail danger" data-quality-control-id="${qualityControl.id}">Fail</a>
        <a href="#" class="button link exewordet__qc_pass ml-4" data-quality-control-id="${qualityControl.id}">Pass</a>
      </div>
    </div>
    <div>
      <div class="mb-3">
          <label for="exewordet__qc_notes" class="form-label">Notes</label>
          <textarea class="form-control" id="exewordet__qc_notes" maxlength="100">${qualityControl.notes || ''}</textarea>
      </div>
    </div>
  `

  return html
}

/*
        <app-dropdown position="right">
          <button slot="toggle" class="dots-button" aria-label="More options">
              <img src="/images/icons/three-dots-vertical.svg" alt="More options">
          </button>
          <div slot="menu" class="dropdown-menu">
              <a href="#" class="dropdown-item ${qualityControl.result ? 'disabled' : ''} exewordet__qc_pass" data-quality-control-id="${qualityControl.id}">Pass</a>
              <a href="#" class="dropdown-item ${qualityControl.result ? 'disabled' : ''} exewordet__qc_fail" data-quality-control-id="${qualityControl.id}">Fail</a>
          </div>
        </app-dropdown>
 */

function generateBatchOperationSectionFinishing (batch) {
  const html = `
    <div class="hstack flex-align-center mb-3">
      <div></div>
      <div>
        <button class="button link exewordet__finish_batch" data-batch-id="${batch.id}">Finish Batch</button>
      </div>
    </div>
    <div></div>
  `

  return html
}

function generateBatchOperationSectionBatchCompleted (batch) {
  const html = `
    <div class="hstack flex-align-center mb-3">
      <div>Batch completed</div>
      <div>
      </div>
    </div>
    <div></div>
  `

  return html
}

function generateBatchOperationSection (batch) {
  const lastCompletedOp = batch.operations.findLast(op => op.status === 'COMPLETED')
  const sequence = lastCompletedOp ? lastCompletedOp.sequence + 1 : 1
  // const operationsCount = batch.operations.length;
  const allOperationsCompleted = batch.operations.every(op => op.status === 'COMPLETED')

  let html = '<div class="tabs-vertical border">'

  // Tabs
  let tabsHtml = '<div class="tab-headers">'

  // <img class="ml-3" src="/images/icons/check2.svg" alt="More options" style="visibility: ${operation.status === 'COMPLETED' ? 'visible' : 'hidden'};">
  function getIcon (status) {
    let iconHtml = `<img class="ml-3" src="/images/icons/stop.svg" alt="${status}">`

    if (status === 'COMPLETED' || status === 'PASS') {
      iconHtml = `<img class="ml-3" src="/images/icons/check-small.svg" alt="${status}"">`
    }

    if (status === 'CANCELED' || status === 'FAIL') {
      iconHtml = `<img class="ml-3" src="/images/icons/cancel.svg" alt="${status}"">`
    }

    if (status === 'RUNNING') {
      iconHtml = `<img class="ml-3" src="/images/icons/play.svg" alt="${status}"">`
    }

    return iconHtml
  }

  for (const [index, operation] of batch.operations.entries()) {
    const active = (index + 1) === sequence ? 'active' : ''

    tabsHtml += `
      <button class="tab-header ${active}" data-tab="vtab${operation.sequence}">
        <div class="hstack">
          <app-item-code code="${operation.operationCode}">${operation.operationName}</app-item-code>
          ${getIcon(operation.status)}
        </div>
      </button>`
  }

  // TODO we are using just one QC for now
  const qualityControl = batch.qualityControls[0]

  if (qualityControl) {
    const active = (allOperationsCompleted && !qualityControl?.result) ? 'active' : ''
    tabsHtml += `
      <button class="tab-header ${active}" data-tab="vtab-qc">
        <div class="hstack">
          <span>Quality Control</span>
          ${getIcon(qualityControl.result)}
        </div>
      </button>`
  }

  const active = (allOperationsCompleted && (typeof qualityControl === 'undefined' || qualityControl?.result)) ? 'active' : ''
  tabsHtml += `
    <button class="tab-header ${active}" data-tab="vtab-finishing">
      <div class="hstack">
        <span>Finishing</span>
        ${getIcon(['PENDING', 'SCHEDULED', 'RUNNING'].includes(batch.status) ? 'PENDING' : batch.status)}
      </div>
    </button>`

  tabsHtml += '</div>'

  html += tabsHtml

  // Sections
  let sectionsHtml = '<div class="tab-content">'

  // Operations
  for (const [index, operation] of batch.operations.entries()) {
    const active = (index + 1) === sequence ? 'active' : ''
    sectionsHtml += `<div class="tab-pane ${active}" id="vtab${operation.sequence}">${renderBatchOperationSectionContents(batch, operation)}</div>`
  }

  // Quality Control
  if (qualityControl) {
    const active = (allOperationsCompleted && !qualityControl?.result) ? 'active' : ''
    sectionsHtml += `<div class="tab-pane ${active}" id="vtab-qc">${renderBatchOperationSectionQc(qualityControl)}</div>`
  }

  // Finishing
  if (batch.status !== 'COMPLETED') {
    console.log('allOperationsCompleted: ', allOperationsCompleted)
    console.log('qualityControl: ', qualityControl)
    const active = (allOperationsCompleted && (typeof qualityControl === 'undefined' || qualityControl?.result)) ? 'active' : ''
    sectionsHtml += `<div class="tab-pane ${active}" id="vtab-finishing">${generateBatchOperationSectionFinishing(batch)}</div>`
  } else {
    sectionsHtml += `<div class="tab-pane ${active}" id="vtab-finishing">${generateBatchOperationSectionBatchCompleted(batch)}</div>`
  }

  sectionsHtml += '</div>'

  html += sectionsHtml

  html += '</div>'
  return html
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
    // html += `
    //   <div class="row">
    //     <div class="col-3">Material</div>
    //     <div class="col-3">Vendor</div>
    //     <div class="col-2">Quantity</div>
    //     <div class="col-3">Lot/s</div>
    //     <div class="col-1">&nbsp;</div>
    //   </div>
    // `
    // for (const material of batch.materials) {
    //   html += renderMaterialRow(batch, material)
    // }

    // html += '<div style="border-bottom: 1px solid var(--gray-300); padding-bottom: 1rem;"></div>'

    // Routing
    html += generateBatchOperationSection(batch)

    html += '</div>'
  })

  elements.batchList.innerHTML = html
}
// ---------------
// Save Actions
// ---------------

// ---------------
// Initial load
// ---------------

async function loadWorkOrder () {
  const response = await backendRpc('app/scheduling/work_order', 'getWorkOrderDetails', { workOrderId })

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    viewState.workOrder = response.data.workOrder
    viewState.batches = response.data.batches
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
    await loadWorkOrder()
  } else {
    AlertBox('No work order ID provided', 'error')

    routerNavigate('execution/work_order')
  }
}

export async function hide () {
  log('View hide', logContext)
}
