import { createModal } from '../../Modal/Modal.js'
import { $ } from '../../../../js/dom.js'
import { securitySafeHtml } from '../../../../js/security.js'
import { backendRpc } from '../../../../js/backend.js'
import { suid } from '../../../../js/utils.js'

export function ProductSelect ({
  title,
  onSelect = null,
  excludeProductId = null
}) {
  title = title || 'Products'

  const UID = suid()

  let productRef = null
  let idRef = null
  let selectedProductId = null

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
                  
                  <hr/>
                  
                  <div id="${UID}_selected" class="mt-2"></div>

                  <div class="row">
                      <div class="col-12">
                        <label for="${UID}_vendor" class="form-label">Vendor</label>
                        <select id="${UID}_vendor" class="form-control"></select>
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

  async function buildResults () {
    productRef = await backendRpc('app/masterdata/product', 'findByNameOrCode', {
      search: $(`#${UID}_name`).value || $(`#${UID}_code`).value || null
    })

    console.log('productRef ProductSelect: ', productRef)
    if (productRef.status.error) {
      showError(productRef.status.message)
      return
    }

    if (!productRef.data || productRef.data.length === 0) {
      $(`#${UID}_results`).textContent = 'No data returned'
      return
    }

    let html = ''
    productRef.data.forEach(item => {
      console.log('item: ', item)
      // Exclude the current product (can't add product as component of itself)
      if (excludeProductId && item.id === excludeProductId) {
        return
      }
      html += `<div class="mb-2"><a href="#" class="text-primary ${UID}_select" data-id="${item.id}">${item.code}</a>: ${item.name}</div>`
    })

    if (html === '') {
      $(`#${UID}_results`).textContent = 'No products available'
    } else {
      $(`#${UID}_results`).innerHTML = html
    }
  }

  function open (id) {
    idRef = id
    productRef = null
    $(`#${UID}_code`).value = ''
    $(`#${UID}_name`).value = ''
    $(`#${UID}_vendor`).value = ''
    $(`#${UID}_vendor`).setAttribute('disabled', '')
    $(`#${UID}_title`).innerHTML = securitySafeHtml(title)
    $(`#${UID}_results`).textContent = ''
    $(`#${UID}_selected`).innerHTML = ''
    $(`#${UID}_results`).textContent = 'Select a Code or Name to search for products.'

    // buildResults()
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

      selectedProductId = event.target.getAttribute('data-id')

      const selectedItem = productRef.data.find(p => p.id === selectedProductId)
      console.log('selectedItem: ', selectedItem)

      $(`#${UID}_results`).textContent = ''
      $(`#${UID}_code`).value = ''
      $(`#${UID}_name`).value = ''
      $(`#${UID}_selected`).innerHTML = `${securitySafeHtml(selectedItem.code)}: <strong>${securitySafeHtml(selectedItem.name)}</strong>
      `

      // let vendorOptionsHtml = '<option value="">Select vendor</option>'
      let vendorOptionsHtml = ''

      if (selectedItem.isOwn) {
        vendorOptionsHtml += '<option value="">Own Product</option>'
      } else {
        $(`#${UID}_vendor`).removeAttribute('disabled')
        for (const vendor of selectedItem.vendors) {
          console.log('vendor: ', vendor)
          vendorOptionsHtml += `<option value="${vendor.id}">${securitySafeHtml(vendor.vendorName)}</option>`
        }
      }

      $(`#${UID}_vendor`).innerHTML = vendorOptionsHtml
    }

    if (event.target.classList.contains(`${UID}_save`)) {
      event.preventDefault()

      if (selectedProductId === null) {
        showError('No product selected')
        return
      }

      const vendor = $(`#${UID}_vendor`).value

      if (!vendor) {
        showError('No vendor selected')
        return
      }

      if (onSelect) {
        const selectedItem = productRef.data.find(p => p.id === selectedProductId)
        console.log('selectedItem: ', selectedItem)

        const selectedVendor = selectedItem.vendors.find(v => v.id === vendor)
        const vendorName = selectedVendor?.vendorName || ''
        const vendorCode = selectedVendor?.vendorCode || ''
        const vendorId = selectedVendor?.vendorId || ''

        onSelect(
          idRef, {
            vendorName,
            vendorCode,
            vendorId,
            ...selectedItem
          })
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
