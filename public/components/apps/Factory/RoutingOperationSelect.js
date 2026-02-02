import { createModal } from '../../Modal/Modal.js'
import { $ } from '../../../js/dom.js'
import { securitySafeHtml } from '../../../js/security.js'
import { suid } from '../../../js/utils.js'

export function RoutingOperationSelect ({
  title,
  onSelect = null
}) {
  title = title || 'Operations'

  const UID = suid()

  let routingIdRef = null

  const html = `
        <div class="modal-backdrop"></div>
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="${UID}_title">Operations</h5>
                    <img src="/images/icons/delete.svg" class="image-button cursor-pointer" id="${UID}_close_button" />
                </div>
                <div class="modal-body">
                    
                  <div class="row">
                      <div class="col-12">
                        <label for="${UID}_operation" class="form-label">Operation</label>
                        <factory-operation id="${UID}_operation"></factory-operation>
                      </div>
                  </div>

                  <div class="row">
                      <div class="col-12">
                        <label for="${UID}_equipment" class="form-label">Equipment</label>
                        <factory-equipment type="text" id="${UID}_equipment"></factory-equipment>
                      </div>
                  </div>

                  <div class="row">
                      <div class="col-12">
                        <label for="${UID}_qc" class="form-label">QC needed</label>
                        <toggle-switch id="${UID}_qc"></toggle-switch>
                      </div>
                  </div>
                </div>

                <div class="modal-footer">
                    <div></div>
                    <img src="/images/icons/check2.svg" class="image-button cursor-pointer ${UID}_save" />
                </div>
              
            </div>
        </div>
    `

  const wrapper = document.createElement('div')
  wrapper.className = 'modal'
  wrapper.innerHTML = html

  document.body.appendChild(wrapper)
  const modal = createModal(wrapper)

  function open (routingId) {
    routingIdRef = routingId
    // $('#${UID}_code').value = ''
    // $('#${UID}_name').value = ''
    // $('#${UID}_title').innerHTML = securitySafeHtml(title)
    // $('#${UID}_results').textContent = ''

    modal.show()
  }

  function close () {
    modal.hide()
  }

  function showError (message) {
    $(`#${UID}_title`).innerHTML = `<span style="color: var(--danger);">${securitySafeHtml(message)}</span>`
  }

  document.body.addEventListener('click', (event) => {
    if (event.target.classList.contains(`${UID}_save`)) {
      event.preventDefault()
      const operationId = $(`#${UID}_operation`).value
      const operationCode = $(`#${UID}_operation`).label
      const equipmentId = $(`#${UID}_equipment`).value
      const qcNeeded = $(`#${UID}_qc`).checked

      if (!operationId) {
        showError('Please select an operation')
        return
      }

      if (onSelect) {
        onSelect(routingIdRef, operationId, operationCode, equipmentId, qcNeeded)
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
