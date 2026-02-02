import { createModal } from '../../Modal/Modal.js'
import { $ } from '../../../js/dom.js'
import { securitySafeHtml } from '../../../js/security.js'
import { backendRpc } from '../../../js/backend.js'

export function ProductSelectSimple ({
  title,
  onSelect = null,
  onClose = null,
  excludeProductId = null
}) {
  let viewStateRef = null

  const html = `
        <div class="modal-backdrop"></div>
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="component_factory_product_select_simple_title">Products</h5>
                    <img src="/images/icons/delete.svg" class="image-button cursor-pointer" id="component_factory_product_select_simple_close_button" />
                </div>
                <div class="modal-body">
                    
                  <div class="row">
                      <div class="col-4">
                        <label for="component_factory_product_select_simple_code" class="form-label">Code</label>
                        <input class="form-control" type="text" id="component_factory_product_select_simple_code">
                      </div>
                      <div class="col-8">
                        <label for="component_factory_product_select_simple_name" class="form-label">Name</label>
                        <input class="form-control" type="text" id="component_factory_product_select_simple_name">
                      </div>
                  </div>

                  <div id="component_factory_product_select_simple_results" class="my-2" style="max-height: 300px; overflow-y: auto;"></div>

                </div>
              
            </div>
        </div>
    `

  const wrapper = document.createElement('div')
  wrapper.className = 'modal'
  wrapper.innerHTML = html

  document.body.appendChild(wrapper)
  const modal = createModal(wrapper)

  title = title || 'Products'

  async function buildResults () {
    const results = await backendRpc('app/masterdata/product', 'findByNameOrCode', {
      search: $('#component_factory_product_select_simple_name').value || $('#component_factory_product_select_simple_code').value || null,
      isOwn: true
    })

    if (results.status.error) {
      showError(results.status.message)
      return
    }

    if (!results.data || results.data.length === 0) {
      $('#component_factory_product_select_simple_results').textContent = 'No data returned'
      return
    }

    let html = ''
    results.data.forEach(item => {
      console.log('item: ', item)
      // Exclude the current product (can't add product as component of itself)
      if (excludeProductId && item.id === excludeProductId) {
        return
      }
      html += `<div class="mb-2"><a href="#" class="text-primary component_factory_product_select_simple_select" data-id="${item.id}" data-code="${item.code}" data-name="${item.name}" data-uom="${item.unitOfMeasureId}" data-uom-name="${item.unitOfMeasureName}" data-uom-code="${item.unitOfMeasureCode}">${item.code}</a>: ${item.name} [${item.unitOfMeasureName}]</div>`
    })

    if (html === '') {
      $('#component_factory_product_select_simple_results').textContent = 'No products available'
    } else {
      $('#component_factory_product_select_simple_results').innerHTML = html
    }
  }

  function open (viewState) {
    viewStateRef = viewState
    $('#component_factory_product_select_simple_code').value = ''
    $('#component_factory_product_select_simple_name').value = ''
    $('#component_factory_product_select_simple_title').innerHTML = securitySafeHtml(title)
    $('#component_factory_product_select_simple_results').textContent = ''

    buildResults()
    modal.show()
  }

  function close () {
    modal.hide()
  }

  function showError (message) {
    $('#component_factory_product_select_simple_title').innerHTML = `<span style="color: var(--danger);">${securitySafeHtml(message)}</span>`
  }

  $('#component_factory_product_select_simple_code').addEventListener('input', () => {
    buildResults()
  })

  $('#component_factory_product_select_simple_name').addEventListener('input', () => {
    buildResults()
  })

  document.body.addEventListener('click', (event) => {
    if (event.target.classList.contains('component_factory_product_select_simple_select')) {
      event.preventDefault()
      // selectedProductId = event.target.getAttribute('data-id')
      // selectedProductCode = event.target.getAttribute('data-code')
      // selectedProductName = event.target.getAttribute('data-name')
      // selectedUnitOfMeasureId = event.target.getAttribute('data-uom')
      // selectedUnitOfMeasureName = event.target.getAttribute('data-uom-name')
      // selectedUnitOfMeasureCode = event.target.getAttribute('data-uom-code')

      viewStateRef.workOrder.productId = event.target.getAttribute('data-id')
      viewStateRef.workOrder.productCode = event.target.getAttribute('data-code')
      viewStateRef.workOrder.productName = event.target.getAttribute('data-name')
      viewStateRef.workOrder.unitOfMeasureId = event.target.getAttribute('data-uom')
      viewStateRef.workOrder.unitOfMeasureName = event.target.getAttribute('data-uom-name')
      viewStateRef.workOrder.unitOfMeasureCode = event.target.getAttribute('data-uom-code')

      if (onSelect) {
        onSelect()
      }

      close()
    }
  })

  $('#component_factory_product_select_simple_close_button').addEventListener('click', () => {
    close()
    if (onClose) {
      onClose()
    }
  })

  // function getId () {
  //   return selectedProductId
  // }

  // function getCode () {
  //   return selectedProductCode
  // }

  // function getName () {
  //   return selectedProductName
  // }

  // function setId (id) {
  //   selectedProductId = id
  // }

  // function setCode (code) {
  //   selectedProductCode = code
  // }

  // function setName (name) {
  //   selectedProductName = name
  // }

  // function setUomId (uomId) {
  //   selectedUnitOfMeasureId = uomId
  // }

  // function setUomName (uomName) {
  //   selectedUnitOfMeasureName = uomName
  // }

  return {
    open,
    close
    // getId,
    // getCode,
    // getName,
    // setId,
    // setCode,
    // setName,
    // setUomId,
    // setUomName
  }
}
