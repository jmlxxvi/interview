import { log } from '../../../../../js/log.js'
import { $ } from '../../../../../js/dom.js'
import { i18nUnixToDate } from '../../../../../js/i18n.js'
import { eventsListen } from '../../../../../js/events.js'
import { DataTable } from '../../../../../components/Tables/DataTable.js'

const logContext = 'INVENTORY:ITEM:LIST'

const t1 = DataTable({
  target: '#invitm__table',
  params: ['app/inventory/item', 'list'],
  options: {
    title: 'Inventory Items',
    action: {
      label: 'New Item',
      href: '#/inventory/item/edit'
    },
    orderCol: 'created_at',
    orderDir: 'desc'
  },
  columns: {
    productCode: {
      visible: false,
      header: 'Product Code'
    },
    productName: {
      visible: true,
      header: 'Product',
      align: 'left',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: start"><div><strong>${value}</strong></div><div style="font-size: .8rem; color: var(--gray-700)">${row.productCode}</div></div>`
      }
    },
    type: {
      visible: true,
      header: 'Type',
      align: 'center',
      transform: (value, _row, _id) => {
        const colors = {
          RAW: 'var(--info)',
          WIP: 'var(--warning)',
          FINISHED: 'var(--success)'
        }
        return `<span style="padding: 0.25rem 0.5rem; border-radius: 0.25rem; background-color: ${colors[value] || 'var(--gray-300)'}; color: white; font-size: 0.875rem;">${value}</span>`
      }
    },
    quantity: {
      visible: true,
      header: 'Quantity',
      align: 'right',
      transform: (value, row, _id) => {
        return parseFloat(value).toFixed(3) + ' ' + (row.unitOfMeasureCode || '')
      }
    },
    locationName: {
      visible: true,
      header: 'Location',
      align: 'left',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: start"><div>${value}</div><div style="font-size: .8rem; color: var(--gray-700)">${row.locationCode}</div></div>`
      }
    },
    lotCode: {
      visible: true,
      header: 'Lot',
      align: 'center'
    },
    vendorName: {
      visible: true,
      header: 'Vendor',
      align: 'left'
    },
    createdBy: {
      visible: true,
      header: 'Created by',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: end"><div>${value}</div><div style="font-size: .8rem">${i18nUnixToDate(row.createdAt)}</div></div>`
      },
      align: 'right'
    },
    id: {
      visible: true,
      transform: (_value, _row, _id) => {
        return '<a href="inventory/item/edit?itemId=[id]" class="router-link button link">Edit</a>'
      },
      header: '&nbsp;',
      sortable: false,
      align: 'center'
    }
  }
})

// Reload table when data changes
eventsListen('event-table-data-changed', (event) => {
  if (event.table === 'inventory_item') {
    t1.reload()
  }
})

export async function show (params) {
  log('View show', logContext)

  if (params.reload === 'true') {
    t1.reload()
  }

  $('#invitm__search').addEventListener('input', (event) => {
    t1.search(event.target.value)
  })
}

export async function hide () {
  log('View hide', logContext)
}
