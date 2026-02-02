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
                    <h5 class="modal-title" id="component_fiscoman_actsel_title">Actividades</h5>
                </div>
                <div class="modal-body">
                    
                    <div class="row">
                        <div class="col-3">
                          <label for="component_fiscoman_actsel_code" class="form-label">Código</label>
                          <input class="form-control" type="text" id="component_fiscoman_actsel_code">
                        </div>
                        <div class="col-6">
                          <label for="component_fiscoman_actsel_text" class="form-label">Descripción</label>
                          <input class="form-control" type="text" id="component_fiscoman_actsel_text">
                        </div>
                    </div>

                      <!-- Text to show file name -->
                    <div id="component_fiscoman_actsel_results" style="max-height: 300px; overflow-y: auto;"></div>

                </div>
                <div class="modal-footer">
                    <img src="/images/icons/delete.svg" class="image-button cursor-pointer" id="component_fiscoman_actsel_close_button" />
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

export function ActivitySelect ({
  title,
  onSelect = null
}) {
  let stateCode = null
  let stateName = null

  if (title) {
    $('#component_fiscoman_actsel_title').innerHTML = securitySafeHtml(title)
  }

  async function buildResults () {
    const results = await backendRpc('app/activities', 'lookup', {
      activityCode: $('#component_fiscoman_actsel_code').value,
      activityDesc: $('#component_fiscoman_actsel_text').value
    })
    console.log('buildResults: ', results)

    if (results.status.error) {
      showError(results.status.message)
      return
    }

    if (results.data.length === 0) {
      $('#component_fiscoman_actsel_results').textContent = 'No se encontraron actividades'
      return
    }

    let html = ''
    results.data.forEach(item => {
      html += `<div class="mb-2"><a href="#" class="text-primary component_fiscoman_actsel_select" data-code="${item.key}" data-desc="${item.value}">(${item.key}) ${item.value}</a></div>`
    })

    $('#component_fiscoman_actsel_results').innerHTML = html
  }

  function open () {
    $('#component_fiscoman_actsel_code').value = ''
    $('#component_fiscoman_actsel_text').value = ''
    $('#component_fiscoman_actsel_results').textContent = 'No se encontraron actividades'

    modal.show()
  }
  function close () {
    modal.hide()
  }

  function showError (message) {
    $('#component_fiscoman_actsel_title').innerHTML = `<span style="color: var(--danger);">${securitySafeHtml(message)}</span>`
  }

  $('#component_fiscoman_actsel_code').addEventListener('input', () => {
    buildResults()
  })

  $('#component_fiscoman_actsel_text').addEventListener('input', () => {
    buildResults()
  })

  document.body.addEventListener('click', (event) => {
    if (event.target.classList.contains('component_fiscoman_actsel_select')) {
      event.preventDefault()

      const code = event.target.getAttribute('data-code')
      const desc = event.target.getAttribute('data-desc')

      stateCode = code
      stateName = desc

      if (typeof onSelect === 'function') {
        onSelect(code, desc)
      }
      close()
    }

    if (event.target.id === 'component_fiscoman_actsel_close_button') {
      event.preventDefault()

      close()
    }
  })

  buildResults()

  return {
    modal,
    open,
    close,
    getCode: function () { return stateCode },
    getName: function () { return stateName },
    setCode: function (code) { stateCode = code },
    setName: function (name) { stateName = name }
  }
}
