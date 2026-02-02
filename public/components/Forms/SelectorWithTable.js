import { $ } from '../../js/dom.js'
import { createModal } from '../Modal/Modal.js'
import { securitySafeHtml } from '../../js/security.js'
import { uuid } from '../../js/utils.js'
import { backendRpc } from '../../js/backend.js'
// import { i18nUnixToDate } from '../../js/i18n.js'

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

export function SelectorWithTable ({
  targetElement,
  rpc,
  onDelete = null,
  loadOnAttach = true,
  columnName = 'Nombre',
  buttonLabel = 'Seleccionar'
}) {
  let localData = []

  const id = uuid()

  if (!(targetElement instanceof HTMLElement)) {
    targetElement = $(targetElement)
  }

  async function buildDocsTable () {
    try {
      targetElement.innerHTML = ''

      const response = await backendRpc(rpc.mod, rpc.fun, rpc.args || {})

      if (response.status.error) {
        targetElement.innerHTML = `<p class="text-danger">Error: ${response.status.message}</p>`
        return
      }

      localData = response.data

      let html = `
        <div class="mb-3" id="components_selector_with_table_container_${id}">
        <table class="table w-100 border">
            <thead>
                <tr>
                    <th style="text-align: left;">${columnName}</th>
                    <th>&nbsp;</th>
                </tr>
            </thead>
            <tbody>
    `

      localData.forEach(item => {
        html += `
        <tr>
          <td>${item.value}</td>
          <td style="text-align: center;"><a href="#" class="components_selector_with_table_delete_${id}" data-key="${item.key}"><img src="/images/icons/delete.svg" alt="${item.value}" /></a></td>
        </tr>
      `
      })

      html += `
            </tbody>
        </table>
    </div>
    `
      targetElement.innerHTML = securitySafeHtml(html)
    } catch (err) {
      console.error('Failed to load documents', err)
      targetElement.innerHTML = `<p class="text-danger">Error: ${err.message}</p>`
    }
    // const container = $('.documents_provincial_tax_git__ca_container tbody')
  }

  async function reload (newRpc) {
    rpc = newRpc ? { ...rpc, ...newRpc } : rpc
    await buildDocsTable()
  }

  if (loadOnAttach) {
    buildDocsTable()
  }

  document.body.addEventListener('click', async (event) => {
    const target = event.target.closest(`.components_selector_with_table_delete_${id}`)
    if (target) {
      event.preventDefault()
      const key = target.getAttribute('data-key')

      if (onDelete && typeof onDelete === 'function') {
        onDelete(key)
      }
    }
  })

  return {
    reload,
    getData () {
      return localData
    },
    getSelected () {
      return localData.map(item => item.key)
    }
  }
}
