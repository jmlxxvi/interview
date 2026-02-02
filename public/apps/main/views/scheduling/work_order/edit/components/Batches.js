import { ConfirmBoxYesNo } from '../../../../../components/Modal/Dialogs.js'
import { createModal } from '../../../../../components/Modal/Modal.js'
import { $ } from '../../../../../js/dom.js'
import { factoryFetchEntityCode } from '../../../../../js/factory.js'
import { securitySafeHtml } from '../../../../../js/security.js'
import { suid, uuid } from '../../../../../js/utils.js'

// let currentWorkOrderId = null
// let currentProductId = null

export function AddBatch ({
  title,
  onSave = null,
  onDelete = null
}) {
  const UID = suid()

  const html = `
        <div class="modal-backdrop"></div>
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="${UID}_title">Create Batch</h5>
                    <img src="/images/icons/delete.svg" class="image-button cursor-pointer" id="${UID}_close_button" />
                </div>
                <div class="modal-body">
                    
                  <div class="row">
                      <div class="col-12 mb-3">
                        <label for="${UID}_quantity" class="form-label">Quantity</label>
                        <input class="form-control" type="number" id="${UID}_quantity" min="0" step="0.001">
                      </div>
                  </div>

                  <div class="row">
                      <div class="col-12 mb-3">
                        <label for="${UID}_employee" class="form-label">Assigned Employee</label>
                        <rpc-select
                          id="${UID}_employee"
                          mod="app/masterdata/user"
                          fun="findAll"
                          label-field="fullName"
                          placeholder="Select employee (optional)">
                        </rpc-select>
                      </div>
                  </div>

                  <div class="row">
                      <div class="col-12 mb-3">
                        <label for="${UID}_bom_version" class="form-label">BOM Version</label>
                        <select class="form-control" id="${UID}_bom_version"></select>
                      </div>
                  </div>

                  <div class="row">
                      <div class="col-12 mb-3">
                        <label for="${UID}_routing_version" class="form-label">Routing Version</label>
                        <select class="form-control" id="${UID}_routing_version"></select>
                      </div>
                  </div>

                  <div class="row">
                      <div class="col-12">
                        <label for="${UID}_quality" class="form-label">Requires Quality Control</label>
                        <toggle-switch id="${UID}_quality" checked></toggle-switch>
                      </div>
                  </div>

                </div>

                <div class="modal-footer">
                    <button class="button link danger ${UID}_delete" style="visibility: hidden;">Delete</button>
                    <button class="button primary ${UID}_save">Save</button>
                </div>
              
            </div>
        </div>
    `

  // TODO we are not using planned start/end for now
  /*
                      <div class="row">
                      <div class="col-12 mb-3">
                        <label for="${UID}_planned_start" class="form-label">Planned Start</label>
                        <input class="form-control" type="datetime-local" id="${UID}_planned_start">
                      </div>
                  </div>

                  <div class="row">
                      <div class="col-12 mb-3">
                        <label for="${UID}_planned_end" class="form-label">Planned End</label>
                        <input class="form-control" type="datetime-local" id="${UID}_planned_end">
                      </div>
                  </div>
    */

  const wrapper = document.createElement('div')
  wrapper.className = 'modal'
  wrapper.innerHTML = html

  document.body.appendChild(wrapper)
  const modal = createModal(wrapper)

  let viewStateRef = null
  let batchIdRef = null
  let operation = null

  $(`#${UID}_title`).innerHTML = securitySafeHtml(title)

  async function open (viewState, batchId) {
    viewStateRef = viewState
    batchIdRef = batchId

    title = title || 'Create Batch'

    $(`#${UID}_title`).innerHTML = securitySafeHtml(title)

    const { routings, boms } = viewState

    $(`#${UID}_routing_version`).innerHTML = routings.map(routing => {
      return `<option value="${routing.routingId}">${routing.version}</option>`
    }).join('')

    $(`#${UID}_bom_version`).innerHTML = boms.map(bom => {
      return `<option value="${bom.bomId}">${bom.version}</option>`
    }).join('')

    const batchData = batchId ? viewState.batches.find(batch => batch.id === batchId) : null
    if (batchData) { // We editing an existing batch
      operation = 'edit'
      $(`.${UID}_delete`).style.visibility = 'visible'

      $(`#${UID}_quantity`).value = batchData.quantity || ''
      $(`#${UID}_employee`).value = batchData.assignedEmployeeId || ''
      // if (batchData.plannedStart) {
      //   const dtStart = new Date(batchData.plannedStart * 1000)
      //   $(`#${UID}_planned_start`).value = dtStart.toISOString().slice(0, 16)
      // } else {
      //   $(`#${UID}_planned_start`).value = ''
      // }
      // if (batchData.plannedEnd) {
      //   const dtEnd = new Date(batchData.plannedEnd * 1000)
      //   $(`#${UID}_planned_end`).value = dtEnd.toISOString().slice(0, 16)
      // } else {
      //   $(`#${UID}_planned_end`).value = ''
      // }

      $(`#${UID}_quality`).checked = batchData.requiresQualityControl

      if (batchData.routingId) {
        $(`#${UID}_routing_version`).value = batchData.routingId
      }

      if (batchData.bomId) {
        $(`#${UID}_bom_version`).value = batchData.bomId
      }
    } else { // New batch
      operation = 'create'
      const remainingQuantity = viewStateRef.remainingQuantity
      console.log('remainingQuantity: ', remainingQuantity)
      $(`#${UID}_quantity`).value = remainingQuantity
      $(`#${UID}_employee`).value = ''
      $(`#${UID}_quality`).checked = true
      // $(`#${UID}_planned_start`).value = ''
      // $(`#${UID}_planned_end`).value = ''
    }

    modal.show()
  }

  function close () {
    modal.hide()
  }

  function showError (message) {
    $(`#${UID}_title`).innerHTML = `<span style="color: var(--danger);">${securitySafeHtml(message)}</span>`
  }

  // Convert datetime-local to Unix timestamp
  // function datetimeLocalToUnix (datetimeLocal) {
  //   if (!datetimeLocal) return null
  //   return Math.floor(new Date(datetimeLocal).getTime() / 1000)
  // }

  document.body.addEventListener('click', async (event) => {
    if (event.target.classList.contains(`${UID}_save`)) {
      event.preventDefault()

      const quantity = parseFloat($(`#${UID}_quantity`).value)
      const assignedEmployeeId = $(`#${UID}_employee`).value || null
      const assignedEmployeeName = $(`#${UID}_employee`).label
      // const plannedStart = datetimeLocalToUnix($(`#${UID}_planned_start`).value)
      // const plannedEnd = datetimeLocalToUnix($(`#${UID}_planned_end`).value)
      const routingId = $(`#${UID}_routing_version`).value
      const routingVersion = $(`#${UID}_routing_version`).options[$(`#${UID}_routing_version`).selectedIndex].text
      const bomId = $(`#${UID}_bom_version`).value
      const bomVersion = $(`#${UID}_bom_version`).options[$(`#${UID}_bom_version`).selectedIndex].text
      const requiresQualityControl = $(`#${UID}_quality`).checked
      // Validate inputs
      if (!quantity || quantity <= 0) {
        showError('Please enter a valid quantity')
        return
      }

      // TODO validate planned start/end

      if (operation === 'create') {
        const batchCode = await factoryFetchEntityCode('BAT')

        if (viewStateRef.totalBatchedQuantity + quantity > (viewStateRef.workOrder.quantity || 0)) {
          showError('Total batch quantity exceeds work order quantity')
          return
        }

        viewStateRef.batches.push({
          id: uuid(),
          batchCode,
          quantity,
          assignedEmployeeId,
          assignedEmployeeName,
          // plannedStart,
          // plannedEnd,
          routingId,
          routingVersion,
          bomId,
          bomVersion,
          requiresQualityControl
        })
      } else if (operation === 'edit') {
        const batchData = viewStateRef.batches.find(batch => batch.id === batchIdRef)

        const currentQuantity = batchData ? batchData.quantity : 0
        if (viewStateRef.totalBatchedQuantity - currentQuantity + quantity > (viewStateRef.workOrder.quantity || 0)) {
          showError('Total batch quantity exceeds work order quantity')
          return
        }

        console.log('batchData: ', batchData)
        if (batchData) {
          batchData.quantity = quantity
          batchData.assignedEmployeeId = assignedEmployeeId
          batchData.assignedEmployeeName = assignedEmployeeName
          // batchData.plannedStart = plannedStart
          // batchData.plannedEnd = plannedEnd
          batchData.routingId = routingId
          batchData.routingVersion = routingVersion
          batchData.bomId = bomId
          batchData.bomVersion = bomVersion
          batchData.requiresQualityControl = requiresQualityControl
        }
      }

      if (onSave) {
        onSave()
      }

      close()
    }

    if (event.target.classList.contains(`${UID}_delete`)) {
      event.preventDefault()

      const confirmed = await ConfirmBoxYesNo('Are you sure you want to delete this batch?', 'Delete Batch')

      if (!confirmed) {
        return
      }

      const batchIndex = viewStateRef.batches.findIndex(batch => batch.id === batchIdRef)
      if (batchIndex !== -1) {
        viewStateRef.batches.splice(batchIndex, 1)
      }

      if (onDelete) {
        onDelete(batchIdRef)
      }

      close()
    }
  })

  $(`#${UID}_close_button`).addEventListener('click', () => {
    close()
  })

  return {
    open,
    close
  }
}
