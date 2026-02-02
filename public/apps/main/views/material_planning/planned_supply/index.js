import { log } from '../../../../../js/log.js'
import { $ } from '../../../../../js/dom.js'
import { i18nUnixToDate } from '../../../../../js/i18n.js'
import { eventsListen } from '../../../../../js/events.js'
import { DataTable } from '../../../../../components/Tables/DataTable.js'
import { preciseRound } from '../../../../../js/math.js'
import { formatSnakeCaseToTitle } from '../../../../../js/utils.js'

const logContext = 'MATERIAL_PLANNING:PLANNED_SUPPLY:LIST'

const t1 = DataTable({
  target: '#matpls__table',
  params: ['app/material_planning/planned_supply', 'list'],
  options: {
    orderCol: 'expected_at',
    orderDir: 'asc',
    rowsPerPage: 10
  },
  columns: {
    productCode: {
      visible: false,
      header: 'Product Code',
      align: 'left'
    },
    productName: {
      visible: true,
      header: 'Product',
      align: 'left',
      transform: (value, row, _id) => {
        return `
          <div style="display: flex; flex-direction: column; align-items: start">
            <div><strong>${value}</strong></div>
            <div style="font-size: .8rem; color: var(--gray-700)">${row.productCode}</div>
            <div style="font-size: .8rem; color: var(--gray-700)">${row.vendorName || ''}</div>
          </div>`
      }
    },
    vendorName: {
      visible: false,
      header: 'Vendor',
      align: 'left',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: start">
          <div>${value}</div>
          <div style="font-size: .8rem; color: var(--gray-700)">${row.vendorCode}</div>
        </div>`
      }
    },
    quantity: {
      visible: true,
      header: 'Quantity',
      align: 'right',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: end">
          <div><strong>${preciseRound(value, 2)}</strong></div>
          <div style="font-size: .8rem; color: var(--gray-700)">${row.productUnitCode || ''}</div>
        </div>`
      }
    },
    sourceType: {
      visible: true,
      header: 'Source',
      align: 'center',
      transform: (value, row, _id) => {
        return row.sourceCode ? `<app-item-code code="${formatSnakeCaseToTitle(row.sourceType)}">${row.sourceCode}</app-item-code>` : ''
      }
    },
    expectedAt: {
      visible: true,
      header: 'Expected',
      align: 'center',
      transform: (value, _row, _id) => {
        return i18nUnixToDate(value, false)
      }
    },
    createdBy: {
      visible: true,
      header: 'Created',
      align: 'right',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: end">
          <div>${value}</div>
          <div style="font-size: .8rem">${i18nUnixToDate(row.createdAt)}</div>
        </div>`
      }
    },
    id: {
      visible: true,
      transform: (_value, _row, _id) => {
        return '<a href="/material_planning/planned_supply/edit?plannedSupplyId=[id]" class="router-link button link">Edit</a>'
      },
      header: '&nbsp;',
      sortable: false,
      align: 'center'
    },

    productId: { visible: false },
    vendorId: { visible: false },
    vendorCode: { visible: false },
    unitId: { visible: false },
    unitCode: { visible: false },
    unitName: { visible: false },
    sourceCode: { visible: false },
    createdAt: { visible: false },
    updatedAt: { visible: false },
    updatedBy: { visible: false }
  }
})

// Reload table when data changes
eventsListen('event-table-data-changed', (event) => {
  if (event.table === 'planned_supply') {
    t1.reload()
  }
})

export async function show (params) {
  log('View show', logContext)

  if (params.reload === 'true') {
    t1.reload()
  }

  $('#matpls__search').addEventListener('input', (event) => {
    t1.search(event.target.value)
    console.log('Search changed ' + event.target.value)
  })
}

export async function hide () {
  log('View hide', logContext)
}
