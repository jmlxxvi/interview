// import { ConfirmBoxYesNo } from '../../../../../components/Modal/Dialogs.js'
import { createModal } from '../../../../../components/Modal/Modal.js'
import { $, $$ } from '../../../../../js/dom.js'
// import { factoryFetchEntityCode } from '../../../../../js/factory.js'
import { securitySafeHtml } from '../../../../../js/security.js'
// import { suid, formatSnakeCaseToTitle } from '../../../../../js/utils.js'
import { suid } from '../../../../../js/utils.js'
import { backendRpc } from '../../../../../js/backend.js'
import { preciseRound } from '../../../../../js/math.js'
import { i18nUnixToDate } from '../../../../../js/i18n.js'

// let currentWorkOrderId = null
// let currentProductId = null

function updateMaterialPicks (data, batchId, materialId, updates) {
  // Find the batch
  const batch = data.batches.find(b => b.id === batchId)
  console.log('batch: ', JSON.stringify(batch, null, 2))
  if (!batch) {
    console.error(`Batch with id ${batchId} not found`)
    return data
  }

  // Find the material
  const material = batch.materials.find(m => m.id === materialId)
  console.log('material: ', JSON.stringify(material, null, 2))
  if (!material) {
    console.error(`Material with id ${materialId} not found`)
    return data
  }

  // Create a map for quick lookup of updates by lotId
  const updatesMap = new Map()
  updates.forEach(update => {
    updatesMap.set(update.lotId, update.pickQty)
  })

  // Filter out picks that should be removed (pickQty = 0) and update others
  const updatedPicks = material.picks?.filter(pick => {
    const newQty = updatesMap.get(pick.lotId)
    return newQty !== 0
  }).map(pick => {
    const newQty = updatesMap.get(pick.lotId)
    if (newQty !== undefined && newQty !== 0) {
      return { ...pick, pickQty: newQty }
    }
    return pick
  })

  // Update the picks array and recalculate total quantity
  material.picks = updatedPicks || []

  return data
}

function updateMaterialPlans (data, batchId, materialId, updates) {
  // Find the batch
  const batch = data.batches.find(b => b.id === batchId)
  console.log('batch: ', JSON.stringify(batch, null, 2))
  if (!batch) {
    console.error(`Batch with id ${batchId} not found`)
    return data
  }

  // Find the material
  const material = batch.materials.find(m => m.id === materialId)
  console.log('material: ', JSON.stringify(material, null, 2))
  if (!material) {
    console.error(`Material with id ${materialId} not found`)
    return data
  }

  // Create a map for quick lookup of updates by lotId
  // const updatesMap = new Map()
  // updates.forEach(update => {
  //   updatesMap.set(update.plannedSupplyId, update.pickQty)
  // })

  // // Filter out picks that should be removed (pickQty = 0) and update others
  // const updatedPlans = material.plans?.filter(plan => {
  //   const newQty = updatesMap.get(plan.plannedSupplyId)
  //   return newQty !== 0
  // }).map(plan => {
  //   const newQty = updatesMap.get(plan.plannedSupplyId)
  //   if (newQty !== undefined && newQty !== 0) {
  //     return { ...plan, pickQty: newQty }
  //   }
  //   return plan
  // })

  // Update the picks array and recalculate total quantity
  material.plans = updates

  return data
}

export function EditSelectedLots ({
  title,
  onSave = null
}) {
  const UID = suid()

  const html = `
        <div class="modal-backdrop"></div>
        <div class="modal-dialog" style="max-width: 800px;">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="${UID}_title">Create Batch</h5>
                    <img src="/images/icons/delete.svg" class="image-button cursor-pointer" id="${UID}_close_button" />
                </div>
                <div class="modal-body">

                <div class="mx-2 mb-4">
                  <div id="${UID}_product"></div>
                  <div id="${UID}_quantity"></div>
                </div>
                  
                    
                  <table class="table" id="${UID}_rows_container">
                    <thead>
                      <tr>
                        <th style="text-align: left;">Lot Code</th>
                        <th style="text-align: right;">Total</th>
                        <th style="text-align: right;">Reserved</th>
                        <th style="text-align: right;">Available</th>
                        <th style="text-align: center;">Expires At</th>
                        <th style="text-align: right;">Picked</th>
                      </tr>
                    </thead>
                    <tbody></tbody>
                  </table>

                  <table class="table" id="${UID}_planned_table">
                    <thead>
                      <tr>
                        <th style="text-align: left;">Source Type</th>
                        <th style="text-align: right;">Source Code</th>
                        <th style="text-align: right;">Reserved</th>
                        <th style="text-align: right;">Available</th>
                        <th style="text-align: center;">Expected At</th>
                        <th style="text-align: center;">Reserved</th>
                      </tr>
                    </thead>
                    <tbody></tbody>
                  </table>

                </div>

                <div class="modal-footer">
                    <div></div>
                    <button class="button primary ${UID}_save">Save</button>
                </div>
              
            </div>
        </div>
    `

  const wrapper = document.createElement('div')
  wrapper.className = 'modal'
  wrapper.innerHTML = html

  document.body.appendChild(wrapper)
  const modal = createModal(wrapper)

  let viewStateRef = null
  let batchIdRef = null
  let materialIdRef = null
  let materialRef = null
  let quantityRef = 0

  let lotsForBatchMaterial = []
  let plannedForBatchMaterial = []

  $(`#${UID}_title`).innerHTML = securitySafeHtml(title)

  function renderLotsTable (material) {
    if (lotsForBatchMaterial.length === 0) {
      $(`#${UID}_rows_container`).innerHTML = '<div class="mx-2 mt-4 mb-2">No available lots found.</div>'
      return
    }

    let html = `<h5 class="px-2">Available Lots</h5>
                  <table class="table" id="${UID}_rows_container">
                    <thead>
                      <tr>
                        <th style="text-align: left;">Lot</th>
                        <th style="text-align: right;">Total</th>
                        <th style="text-align: right;">Reserved</th>
                        <th style="text-align: right;">Available</th>
                        <th style="text-align: center;">Expires At</th>
                        <th style="text-align: right;">Picked</th>
                      </tr>
                    </thead>
                    <tbody>`

    const picks = material?.picks || []

    // TODO when editing we see the reservation for the batch we are editing
    // we need to filter that because that reservation may be used again for the edited batch
    for (const lot of lotsForBatchMaterial) {
      const uom = lot.unitOfMeasureCode || ''

      const pick = picks.find(pick => pick.lotId === lot.lotId)

      html += `<tr>
                    <td style="text-align: left;">${lot.lotCode}</td>
                    <td style="text-align: right;">${lot.totalQty} ${uom}</td>
                    <td style="text-align: right;">${lot.reservedQty} ${uom}</td>
                    <td style="text-align: right;">${lot.availableQty} ${uom}</td>
                    <td style="text-align: center;">${i18nUnixToDate(lot.expirationAt, false)}</td>
                    <td style="text-align: right;">
                      <div class="hstack flex-align-center flex-justify-end flex-gap-2">
                        <input class="form-control ${UID}_picked_input" data-lot-id="${lot.lotId}" style="width: 80px; text-align: right;" type="number" value="${pick ? preciseRound(pick.pickQty, 2) : 0}" /> 
                        <div>${uom}</div>
                      </div>
                    </td>
                </tr>`
    }

    html += '</tbody></table>'

    $(`#${UID}_rows_container`).innerHTML = html
  }

  function renderPlannedTable (material) {
    let html = ''

    if (plannedForBatchMaterial.length === 0) {
      $(`#${UID}_planned_table`).innerHTML = '<div class="mx-2 mt-4 mb-2">No planned supplies found.</div>'
      return
    }

    const planned = material?.planned || []

    // TODO when editing we see the reservation for the batch we are editing
    // we need to filter that because that reservation may be used again for the edited batch
    for (const lot of plannedForBatchMaterial) {
      const uom = lot.unitOfMeasureCode || ''

      const plan = planned.find(plan => plan.plannedSupplyId === lot.plannedSupplyId)

      /*
  {
    plannedSupplyId: '8f7db0f1-7b37-41b9-8a8a-0bb1553398a3',
    productId: '25854f91-edd3-4a2a-9030-2629614eebbb',
    productCode: 'RM-003',
    productName: 'Butter',
    vendorId: 'fce9a960-145c-4cec-98a5-09471d13a005',
    vendorCode: 'SUP-001',
    vendorName: 'Global Ingredients Ltd.',
    reservedQuantity: 0,
    quantity: 4,
    unitOfMeasureId: 'c30d2783-d36d-4106-94f2-28d5a399c3d6',
    unitOfMeasureCode: 'kg',
    unitOfMeasureName: 'Kilogram',
    sourceType: 'PURCHASE_ORDER',
    sourceCode: 'xxx',
    expectedAt: 1766718000000
  }

                          <th style="text-align: left;">Source Type</th>
                        <th style="text-align: right;">Source Code</th>
                        <th style="text-align: right;">Reserved</th>
                        <th style="text-align: right;">Available</th>
                        <th style="text-align: center;">Expected At</th>
    */

      html += `<tr>
                    <td style="text-align: left;">${lot.sourceType}</td>
                    <td style="text-align: right;">${lot.sourceCode || ''} ${uom}</td>
                    <td style="text-align: right;">${lot.reservedQuantity} ${uom}</td>
                    <td style="text-align: right;">${lot.quantity} ${uom}</td>
                    <td style="text-align: center;">${i18nUnixToDate(lot.expectedAt, false)}</td>
                    <td style="text-align: right;"><div class="hstack flex-align-center"><input class="form-control ${UID}_planned_input" data-lot-id="${lot.lotId}" style="width: 80px; text-align: right;" type="number" value="${plan ? preciseRound(plan.pickQty, 2) : 0}" /> ${uom}</div></td>
                </tr>`
    }

    html += '</tbody></table>'

    $(`#${UID}_planned_table`).innerHTML = html
  }

  async function open (viewState, batchId, materialId) {
    viewStateRef = viewState
    batchIdRef = batchId
    materialIdRef = materialId

    title = title || 'Select Lots'

    $(`#${UID}_title`).innerHTML = securitySafeHtml(title)

    const batch = viewState.batches.find(batch => batch.id === batchId)

    const batchQuantity = batch ? batch.quantity : 0

    // const { routings, boms } = viewState
    materialRef = materialId ? viewState.batches.flatMap(batch => batch.materials).find(material => material.id === materialId) : null
    console.log('materialRef: ', materialRef)

    /*

    materialRef:  {
  "id": "da599aa4-93b9-4d30-b46c-782ffe991977",
  "notes": null,
  "picks": [
    {
      "id": "91c29338-6db9-4bd6-b691-ec5aad92eed8",
      "lotId": "33a1687a-cbea-4f0b-a95a-f68a07ce37c7",
      "notes": "Reservation for Work Order WOR-0740, Batch BAT-0741",
      "status": "RESERVED",
      "batchId": "c2af2c41-9dee-40fc-be41-f4c3bef32fec",
      "lotCode": "LOT-PKG001-2024-11-001",
      "pickQty": 12,
      "productId": "fea2a75d-f7e9-4e11-a4cd-e4379b2f5ae4",
      "locationId": "f32f8b2f-62aa-4eef-9919-75227b7cb474",
      "releasedAt": null,
      "releasedBy": null,
      "reservedAt": 1764900841943,
      "reservedBy": "550e8400-e29b-41d4-a716-446655440000",
      "productCode": "PKG-001",
      "productName": "Cookie Box",
      "expirationAt": 1793491200000,
      "locationCode": "WH1-A2-S1",
      "locationName": "Warehouse 1 - Aisle 2 - Shelf 1",
      "releasedByName": null,
      "reservedByName": "Juan Martín Guillén",
      "inventoryItemId": "a3aa2577-e2da-4bb2-bc45-29e65092b2c0",
      "unitOfMeasureId": null,
      "unitOfMeasureCode": null,
      "unitOfMeasureName": null
    }
  ],
  "status": "PENDING",
  "batchId": "c2af2c41-9dee-40fc-be41-f4c3bef32fec",
  "quantity": 1,
  "vendorId": "4083bcbb-8abd-43b1-86d0-2abc444028a5",
  "bomItemId": "7efbf497-4b33-45e4-9ff5-bf6e1947ff21",
  "createdAt": 1764900841940,
  "createdBy": "Juan Martín Guillén",
  "updatedAt": null,
  "updatedBy": null,
  "vendorCode": "SUP-003",
  "vendorName": "Premium Packaging Co.",
  "componentId": "fea2a75d-f7e9-4e11-a4cd-e4379b2f5ae4",
  "componentCode": "PKG-001",
  "componentName": "Cookie Box",
  "batchMaterialId": "da599aa4-93b9-4d30-b46c-782ffe991977",
  "unitOfMeasureId": "2a6e10c5-43cc-4b00-9a12-3910264346f0",
  "unitOfMeasureCode": "pcs",
  "unitOfMeasureName": "Piece"
}

[
    {
      "inventoryItemId": "3a3e30d8-df92-461f-98c2-ccd21ac73c00",
      "lotId": "b5fb1606-7c7b-43c5-aff3-97207aea01d0",
      "locationId": "0fb96650-4897-4e11-845b-293ff1911791",
      "productId": "5de45e90-eb02-461f-b306-c54c81d3583d",
      "productCode": "RM-002",
      "productName": "Sugar",
      "reservedQty": 0.5,
      "availableQty": 0,
      "totalQty": 0.5,
      "expirationAt": 1761228400000,
      "unitOfMeasureId": "c30d2783-d36d-4106-94f2-28d5a399c3d6",
      "unitOfMeasureCode": "kg",
      "unitOfMeasureName": "Kilogram"
    },
    {
      "inventoryItemId": "7b9293be-7459-4511-82f6-12ceafaa9987",
      "lotId": "01341864-1070-4180-b187-0aadf6fa0eae",
      "locationId": "0fb96650-4897-4e11-845b-293ff1911791",
      "productId": "5de45e90-eb02-461f-b306-c54c81d3583d",
      "productCode": "RM-002",
      "productName": "Sugar",
      "reservedQty": 3.1,
      "availableQty": 296.9,
      "totalQty": 300,
      "expirationAt": 1761878400000,
      "unitOfMeasureId": "c30d2783-d36d-4106-94f2-28d5a399c3d6",
      "unitOfMeasureCode": "kg",
      "unitOfMeasureName": "Kilogram"
    }
  ],
    */

    if (materialRef) {
      quantityRef = preciseRound(batchQuantity * (materialRef.quantity || 0))

      $(`#${UID}_product`).innerHTML = `
        <app-item-code code="${materialRef.vendorName || ''}"><strong>${materialRef.componentName || ''}</strong></app-item-code>
      `
      $(`#${UID}_quantity`).textContent = `Quantity needed: ${quantityRef} ${materialRef.unitOfMeasureCode || ''}`

      // Load lots for the material's product and vendor
      console.log('materialRef: ', JSON.stringify(materialRef, null, 2))
      const response = await backendRpc('app/scheduling/work_order', 'selectLotsForBatchMaterial', {
        productId: materialRef.componentId,
        vendorId: materialRef.vendorId
      })
      console.log('selectLotsForBatchMaterial response: ', response)

      if (response.status.error) {
        showError(response.status.message)
        return
      }

      lotsForBatchMaterial = response.data || []

      renderLotsTable(materialRef)

      console.log('response: ', JSON.stringify(response, null, 2))

      // Load planned lots for the material's product and vendor
      const plannedResponse = await backendRpc('app/scheduling/work_order', 'selectPlannedForBatchMaterial', {
        productId: materialRef.componentId,
        vendorId: materialRef.vendorId
      })

      if (plannedResponse.status.error) {
        showError(plannedResponse.status.message)
        return
      }

      plannedForBatchMaterial = plannedResponse.data || []
      console.log('plannedForBatchMaterial: ', JSON.stringify(plannedForBatchMaterial, null, 2))

      renderPlannedTable(materialRef)
    } else {
      showError('Material not found')
    }

    modal.show()
  }

  function close () {
    modal.hide()
  }

  function showError (message) {
    $(`#${UID}_title`).innerHTML = `<span style="color: var(--danger);">${securitySafeHtml(message)}</span>`
  }

  document.body.addEventListener('click', async (event) => {
    if (event.target.classList.contains(`${UID}_save`)) {
      event.preventDefault()

      // Inventory picks to apply
      const picks = []

      const selectedLotInputs = $$(`.${UID}_picked_input`)

      for (const input of selectedLotInputs) {
        const lotId = input.getAttribute('data-lot-id')
        const pickQty = preciseRound(parseFloat(input.value) || 0)
        console.log('lotId: ', lotId)
        console.log('pickQty: ', pickQty)
        picks.push({ lotId, pickQty })

        console.log('picks: ', picks)
      }
      // const lotId = event.target.getAttribute('data-lot-id')
      // console.log('lotId: ', lotId)
      // const pickQty = parseFloat(event.target.value)
      // console.log('pickQty: ', pickQty)

      const totalPickedQuantity = preciseRound(picks.reduce((total, pick) => total + pick.pickQty, 0))

      // Planned quantity for the material in the batch
      const plans = []

      const selectedPlanInputs = $$(`.${UID}_planned_input`)

      for (const input of selectedPlanInputs) {
        const plannedSupplyId = input.getAttribute('data-supply-id')
        const pickQty = preciseRound(parseFloat(input.value) || 0)
        console.log('plannedSupplyId: ', plannedSupplyId)
        console.log('pickQty: ', pickQty)
        const plan = plannedForBatchMaterial.find(plan => plan.plannedSupplyId === plannedSupplyId)
        plans.push({ ...plan, pickQty })
        console.log('plans: ', plans)
      }
      // const lotId = event.target.getAttribute('data-lot-id')
      // const pickQty = parseFloat(event.target.value)
      // console.log('lotId: ', lotId)
      // console.log('pickQty: ', pickQty)

      const totalPlannedQuantity = preciseRound(plans.reduce((total, plan) => total + plan.pickQty, 0))

      const totalQuantity = preciseRound(totalPickedQuantity + totalPlannedQuantity)

      console.log('totalPickedQuantity: ', totalPickedQuantity)
      console.log('totalPlannedQuantity: ', totalPlannedQuantity)
      console.log('totalQuantity: ', totalQuantity)
      console.log('quantityRef: ', quantityRef)

      const uom = materialRef.unitOfMeasureCode || ''

      if (totalQuantity < quantityRef) {
        showError(`
          ${totalQuantity} ${uom} of selected quantity<br>
          ${preciseRound(totalPickedQuantity)} ${uom} from Inventory<br>
          ${preciseRound(totalPlannedQuantity)} ${uom} from Planned Supplies<br>
          is less than the quantity needed for this batch: ${quantityRef} ${uom}`)
        return
      }

      if (totalQuantity > quantityRef) {
        showError(`
          ${totalQuantity} ${uom} of selected quantity<br>
          ${preciseRound(totalPickedQuantity)} ${uom} from Inventory<br>
          ${preciseRound(totalPlannedQuantity)} ${uom} from Planned Supplies<br>
          is more than the quantity needed for this batch : ${quantityRef} ${uom}`)
        return
      }

      viewStateRef = updateMaterialPicks(viewStateRef, batchIdRef, materialIdRef, picks)
      viewStateRef = updateMaterialPlans(viewStateRef, batchIdRef, materialIdRef, plans)

      console.log('Updated viewStateRef: ', JSON.stringify(viewStateRef, null, 2))

      if (onSave) {
        onSave()
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
