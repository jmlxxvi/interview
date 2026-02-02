import { createModal } from '../../../../../components/Modal/Modal.js'
import { $ } from '../../../../../js/dom.js'
// import { factoryFetchEntityCode } from '../../../../../js/factory.js'
import { securitySafeHtml } from '../../../../../js/security.js'
// import { uuid } from '../../../../../js/utils.js'

const html = `
        <div class="modal-backdrop"></div>
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="component_operations_create_title">Create Batch</h5>
                    <img src="/images/icons/delete.svg" class="image-button cursor-pointer" id="component_operations_create_close_button" />
                </div>
                <div class="modal-body">
                    
                  <div class="row">
                      <div class="col-12 mb-3">
                        <label for="component_operations_create_qc" class="form-label">Requires Quality Inspection</label>
                        <toggle-switch id="component_operations_create_qc"></toggle-switch>
                      </div>
                  </div>
                </div>

                <div class="modal-footer">
                  <div></div>
                  <button class="button primary component_operations_create_save">Save</button>
                </div>
              
            </div>
        </div>
    `

const wrapper = document.createElement('div')
wrapper.className = 'modal'
wrapper.innerHTML = html

document.body.appendChild(wrapper)
const modal = createModal(wrapper)

export function AddOperation ({
  title,
  onSave = null
}) {
  title = title || 'Edit Operation'

  let operationDataRef = null

  // Reset form
  $('#component_operations_create_title').innerHTML = securitySafeHtml(title)

  async function open (viewState, batchId, operationId) {
    console.log('AddOperation viewState, batchId, operationId: ', viewState, batchId, operationId)
    const batchData = viewState.batches.find(batch => batch.id === batchId)
    console.log('batchData: ', batchData)
    if (!batchData) {
      showError('Batch not found')
      return
    }

    operationDataRef = batchData.operations.find(op => op.routing_operation_id === operationId)
    console.log('operationDataRef: ', operationDataRef)
    if (operationDataRef) { // We editing an existing batch
      $('#component_operations_create_qc').checked = operationDataRef.requires_quality_control
    }

    modal.show()
  }

  function close () {
    modal.hide()
  }

  function showError (message) {
    $('#component_operations_create_title').innerHTML = `<span style="color: var(--danger);">${securitySafeHtml(message)}</span>`
  }

  document.body.addEventListener('click', async (event) => {
    if (event.target.classList.contains('component_operations_create_save')) {
      event.preventDefault()

      operationDataRef.requires_quality_control = $('#component_operations_create_qc').checked

      if (onSave) {
        onSave()
      }

      close()
    }
  })

  $('#component_operations_create_close_button').addEventListener('click', () => {
    close()
  })

  return {
    open,
    close
  }
}
