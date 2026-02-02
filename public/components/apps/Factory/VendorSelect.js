// import { $ } from '../../js/dom.js'
import { createModal } from '../../Modal/Modal.js'
import { $ } from '../../../js/dom.js'
import { securitySafeHtml } from '../../../js/security.js'
import { backendRpc } from '../../../js/backend.js'
import { suid } from '../../../js/utils.js'

export function VendorSelect ({
  title,
  onSelect = null
}) {
  title = title || 'Vendors'

  const UID = suid()

  let vendorDataRef = null

  const html = `
        <div class="modal-backdrop"></div>
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="${UID}_title">Vendors</h5>
                    <img src="/images/icons/delete.svg" class="image-button cursor-pointer" id="${UID}_close_button" />
                </div>
                <div class="modal-body">
                    
                  <div class="row">
                      <div class="col-4">
                        <label for="${UID}_code" class="form-label">Code</label>
                        <input class="form-control" type="text" id="${UID}_code">
                      </div>
                      <div class="col-8">
                        <label for="${UID}_name" class="form-label">Name</label>
                        <input class="form-control" type="text" id="${UID}_name">
                      </div>
                  </div>

                  <div id="${UID}_results" class="my-2" style="max-height: 300px; overflow-y: auto;"></div>

                </div>
              
            </div>
        </div>
    `

  const wrapper = document.createElement('div')
  wrapper.className = 'modal'
  wrapper.innerHTML = html

  document.body.appendChild(wrapper)
  const modal = createModal(wrapper)

  async function buildResults () {
    const result = await backendRpc('app/masterdata/vendor', 'findByNameOrCode', {
      code: $(`#${UID}_code`).value,
      name: $(`#${UID}_name`).value
    })
    console.log('buildResults: ', result)

    if (result.status.error) {
      showError(result.status.message)
      return
    }

    if (result.data.length === 0) {
      $(`#${UID}_results`).textContent = 'No data returned'
      return
    }

    vendorDataRef = result.data

    let html = ''
    vendorDataRef.forEach(item => {
      html += `<div class="mb-2"><a href="#" class="text-primary ${UID}_select" data-id="${item.id}">${item.code}</a>: ${item.name}</div>`
    })

    $(`#${UID}_results`).innerHTML = html
  }

  function open () {
    $(`#${UID}_code`).value = ''
    $(`#${UID}_name`).value = ''
    $(`#${UID}_title`).innerHTML = securitySafeHtml(title)
    $(`#${UID}_results`).textContent = ''

    modal.show()
  }
  function close () {
    modal.hide()
  }

  function showError (message) {
    $(`#${UID}_title`).innerHTML = `<span style="color: var(--danger);">${securitySafeHtml(message)}</span>`
  }

  $(`#${UID}_code`).addEventListener('input', () => {
    buildResults()
  })

  $(`#${UID}_name`).addEventListener('input', () => {
    buildResults()
  })

  document.body.addEventListener('click', (event) => {
    if (event.target.classList.contains(`${UID}_select`)) {
      event.preventDefault()

      const elementId = event.target.getAttribute('data-id')
      const elementData = vendorDataRef.find(item => item.id === elementId)

      if (typeof onSelect === 'function') {
        onSelect(elementId, elementData)
      }
      close()
    }

    if (event.target.id === `${UID}_close_button`) {
      event.preventDefault()

      close()
    }
  })

  buildResults()

  return {
    modal,
    open,
    close
  }
}
