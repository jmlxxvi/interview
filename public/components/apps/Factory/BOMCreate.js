import { createModal } from '../../Modal/Modal.js'
import { $ } from '../../../js/dom.js'
import { securitySafeHtml } from '../../../js/security.js'
// import { backendRpc } from '../../../js/backend.js'

const html = `
        <div class="modal-backdrop"></div>
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="component_factory_bom_create_title">Products</h5>
                    <img src="/images/icons/delete.svg" class="image-button cursor-pointer" id="component_factory_bom_create_close_button" />
                </div>
                <div class="modal-body">
                    
                  <div class="row">
                      <div class="col-12">
                        <label for="component_factory_bom_create_name" class="form-label">Name</label>
                        <input class="form-control" type="text" id="component_factory_bom_create_name">
                      </div>
                  </div>

                  <div id="component_factory_bom_create_results" class="my-2" style="max-height: 300px; overflow-y: auto;"></div>

                  <div class="modal-footer">
                    <div></div>
                    <img src="/images/icons/check2.svg" class="image-button cursor-pointer" id="component_factory_bom_create_save_button" />
                </div>
              
            </div>
        </div>
    `

const wrapper = document.createElement('div')
wrapper.className = 'modal'
wrapper.innerHTML = html

document.body.appendChild(wrapper)
const modal = createModal(wrapper)

export function ProductSelect ({
  title,
  onSelect = null,
  excludeProductId = null
}) {
  title = title || 'Products'

  function open () {
    $('#component_factory_bom_create_code').value = ''
    $('#component_factory_bom_create_name').value = ''
    $('#component_factory_bom_create_title').innerHTML = securitySafeHtml(title)
    $('#component_factory_bom_create_results').textContent = ''

    buildResults()
    modal.show()
  }

  function close () {
    modal.hide()
  }

  function showError (message) {
    $('#component_factory_bom_create_title').innerHTML = `<span style="color: var(--danger);">${securitySafeHtml(message)}</span>`
  }

  $('#component_factory_bom_create_code').addEventListener('input', () => {
    buildResults()
  })

  $('#component_factory_bom_create_name').addEventListener('input', () => {
    buildResults()
  })

  document.body.addEventListener('click', (event) => {
    if (event.target.classList.contains('component_factory_bom_create_select')) {
      event.preventDefault()
      const productId = event.target.getAttribute('data-id')
      const productKey = event.target.getAttribute('data-key')

      if (onSelect) {
        onSelect(productId, productKey)
      }

      close()
    }
  })

  $('#component_factory_bom_create_close_button').addEventListener('click', () => {
    close()
  })

  return {
    open,
    close
  }
}
