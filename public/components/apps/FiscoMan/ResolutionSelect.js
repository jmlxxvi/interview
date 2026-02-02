// import { $ } from '../../js/dom.js'
import { createModal } from '../../Modal/Modal.js'
import { $ } from '../../../js/dom.js'
import { securitySafeHtml } from '../../../js/security.js'
import { backendRpc } from '../../../js/backend.js'

const html = `
        <div class="modal-backdrop"></div>
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="component_fiscoman_ressel_title">Resoluciones</h5>
                </div>
                <div class="modal-body">
                    
                    <div class="row">
                        <div class="col-3">
                          <label for="component_fiscoman_ressel_number" class="form-label">Número</label>
                          <input class="form-control" type="text" id="component_fiscoman_ressel_number">
                        </div>
                        <div class="col-3">
                          <label for="component_fiscoman_ressel_year" class="form-label">Año</label>
                          <input class="form-control" type="text" id="component_fiscoman_ressel_year">
                        </div>
                        <div class="col-6">
                          <label for="component_fiscoman_ressel_text" class="form-label">Texto de la resolución</label>
                          <input class="form-control" type="text" id="component_fiscoman_ressel_text">
                        </div>
                    </div>

                      <!-- Text to show file name -->
                    <div id="component_fiscoman_ressel_results" style="max-height: 300px; overflow-y: auto;"></div>

                </div>
                <div class="modal-footer">
                    <img src="/images/icons/delete.svg" class="image-button cursor-pointer" id="component_fiscoman_ressel_close_button" />
                    <div></div>
                </div>
            </div>
        </div>
    `

const wrapper = document.createElement('div')
wrapper.className = 'modal'
wrapper.innerHTML = html

// <button class="btn-close" data-dismiss="modal" aria-label="Close">×</button>

document.body.appendChild(wrapper)
const modal = createModal(wrapper)

export function ResolutionSelect ({
  title,
  onSelect = null
}) {
  if (title) {
    $('#component_fiscoman_ressel_title').innerHTML = securitySafeHtml(title)
  }

  async function buildResults () {
    const results = await backendRpc('app/resolutions', 'lookup', {
      resolutionNumber: $('#component_fiscoman_ressel_number').value,
      resolutionYear: $('#component_fiscoman_ressel_year').value,
      resolutionText: $('#component_fiscoman_ressel_text').value
    })
    console.log('buildResults: ', results)

    if (results.status.error) {
      showError(results.status.message)
      return
    }

    if (results.data.length === 0) {
      $('#component_fiscoman_ressel_results').textContent = 'No se encontraron resoluciones'
      return
    }

    let html = ''
    results.data.forEach(item => {
      const text = item.resolution_subject.length > 120 ? item.resolution_subject.substring(0, 117) + '...' : item.resolution_subject
      html += `<div class="mb-2"><a href="#" class="text-primary component_fiscoman_ressel_select" data-id="${item.id}" data-key="${item.resolution_key}">${item.resolution_title}</a>: ${text}</div>`
    })

    $('#component_fiscoman_ressel_results').innerHTML = html
  }

  function open () {
    $('#component_fiscoman_ressel_number').value = ''
    $('#component_fiscoman_ressel_year').value = ''
    $('#component_fiscoman_ressel_title').innerHTML = securitySafeHtml(title)
    $('#component_fiscoman_ressel_results').textContent = 'No se encontraron resoluciones'

    modal.show()
  }
  function close () {
    modal.hide()
  }

  function showError (message) {
    $('#component_fiscoman_ressel_title').innerHTML = `<span style="color: var(--danger);">${securitySafeHtml(message)}</span>`
  }

  $('#component_fiscoman_ressel_year').addEventListener('input', () => {
    buildResults()
  })

  $('#component_fiscoman_ressel_number').addEventListener('input', () => {
    buildResults()
  })

  $('#component_fiscoman_ressel_text').addEventListener('input', () => {
    buildResults()
  })

  document.body.addEventListener('click', (event) => {
    if (event.target.classList.contains('component_fiscoman_ressel_select')) {
      event.preventDefault()

      const resolutionId = event.target.getAttribute('data-id')
      const resolutionKey = event.target.getAttribute('data-key')

      if (typeof onSelect === 'function') {
        onSelect(resolutionId, resolutionKey)
      }
      close()
    }

    if (event.target.id === 'component_fiscoman_ressel_close_button') {
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
