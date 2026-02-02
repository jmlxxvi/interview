import { createModal } from '../../../Modal/Modal.js'
import { $ } from '../../../../js/dom.js'
import { securitySafeHtml } from '../../../../js/security.js'
import { backendRpc } from '../../../../js/backend.js'
import { suid } from '../../../../../js/utils.js'

export function InventoryItemSelect ({
  title,
  onSelect = null,
  onClose = null,
  excludeProductId = null
}) {
  const UID = suid()

  // let viewStateRef = null
  // let selectedProductId = null
  // let selectedProductCode = null
  // let selectedProductName = null
  // let selectedUnitOfMeasureId = null
  // let selectedUnitOfMeasureName = null
  // let selectedUnitOfMeasureCode = null

  const html = `
        <div class="modal-backdrop"></div>
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="${UID}_title">Products</h5>
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

  title = title || 'Products'

  async function buildResults () {
    const results = await backendRpc('app/inventory/item', 'findByNameOrCode', {
      search: $(`#${UID}_name`).value || $(`#${UID}_code`).value || null
    })

    if (results.status.error) {
      showError(results.status.message)
      return
    }

    if (!results.data || results.data.length === 0) {
      $(`#${UID}_results`).textContent = 'No data returned'
      return
    }

    /*

    {
      "id": "14bacd24-3463-46ec-ba63-6c0e66d7b814",
      "productId": "352ba3e2-1d55-45a9-a4b9-a52887099640",
      "productCode": "PRD-0443",
      "productName": "Leche entera",
      "lotId": "4ada13aa-ac72-4b0b-a77c-349c666e7bdd",
      "lotCode": "LENT11234",
      "vendorId": "967279c1-f764-4779-9114-62a0fa09c51f",
      "vendorCode": "VEN-0040",
      "vendorName": "Mismo pepe",
      "price": 99,
      "currency": "USD",
      "quantity": 66,
      "expirationAt": null,
      "locationId": "ee97da3e-81f8-437e-9abc-df1d7a8ca599",
      "locationCode": "LOC-0437",
      "locationName": "qqqqq",
      "type": "RAW"
    },
    */

    let html = ''
    results.data.forEach(item => {
      console.log('item: ', item)
      // Exclude the current product (can't add product as component of itself)
      if (excludeProductId && item.id === excludeProductId) {
        return
      }
      // html += `<div class="mb-2"><a href="#" class="text-primary ${UID}_select" data-id="${item.id}" data-item="${btoa(JSON.stringify(item))}">${item.code}</a>: ${item.name} [${item.unitOfMeasureName}]</div>`
      html += `<div class="row mb-2"><a href="#" class="text-primary ${UID}_select" data-id="${item.id}" data-item="${btoa(JSON.stringify(item))}">${item.code}</a>: ${item.name} [${item.unitOfMeasureName}]</div>`
    })

    if (html === '') {
      $(`#${UID}_results`).textContent = 'No products available'
    } else {
      $(`#${UID}_results`).innerHTML = html
    }
  }

  function open () {
    $(`#${UID}_code`).value = ''
    $(`#${UID}_name`).value = ''
    $(`#${UID}_title`).innerHTML = securitySafeHtml(title)
    $(`#${UID}_results`).textContent = ''

    buildResults()
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
      // selectedProductId = event.target.getAttribute('data-id')
      // selectedProductCode = event.target.getAttribute('data-code')
      // selectedProductName = event.target.getAttribute('data-name')
      // selectedUnitOfMeasureId = event.target.getAttribute('data-uom')
      // selectedUnitOfMeasureName = event.target.getAttribute('data-uom-name')
      // selectedUnitOfMeasureCode = event.target.getAttribute('data-uom-code')

      const id = event.target.getAttribute('data-id')
      const item = JSON.parse(atob(event.target.getAttribute('data-item')))

      console.log(id, item)

      if (onSelect) {
        onSelect(id, item)
      }

      close()
    }
  })

  $(`#${UID}_close_button`).addEventListener('click', () => {
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
