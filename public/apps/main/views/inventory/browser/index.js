import { log } from '../../../../../js/log.js'
import { $ } from '../../../../../js/dom.js'
import { i18nUnixToDate } from '../../../../../js/i18n.js'
import { eventsListen } from '../../../../../js/events.js'
import { DataTable } from '../../../../../components/Tables/DataTable.js'
import { preciseRound } from '../../../../../js/math.js'
import { formatSnakeCaseToTitle } from '../../../../../js/utils.js'

const logContext = 'INVENTORY:BROWSER:LIST'

const isOwnCheck = $('#invbro__is_own')

isOwnCheck.addEventListener('change', (event) => {
  // console.log(event)
  const checked = event.target.checked
  console.log('checked: ', checked)
  t1.setArgs({
    isOwn: checked
  })
})

const t1 = DataTable({
  target: '#invibro__items_table',
  params: ['app/inventory/item', 'list'],
  options: {
    orderCol: 'created_at',
    orderDir: 'desc',
    rowsPerPage: 10
  },
  columns: {
    type: {
      visible: true,
      header: 'Type',
      align: 'right',
      transform: (value, _row, _id) => {
        const colors = {
          RAW: 'var(--gray-900)',
          WIP: 'var(--gray-900)',
          FINISHED: 'var(--gray-900)',
          PRODUCTION: 'var(--gray-900)'
        }
        return `<app-badge color="${colors[value] || 'var(--gray-300)'}">${formatSnakeCaseToTitle(value)}</app-badge>`
      }
    },

    productCode: {
      visible: false,
      header: 'Product Code'
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
    lotCode: {
      visible: true,
      header: 'Lot'
    },
    quantity: {
      visible: true,
      header: 'Quantity',
      align: 'right',
      transform: (value, row, _id) => {
        const reserved = row.reservedQuantity > 0 ? `(-${parseFloat(row.reservedQuantity).toFixed(2)})` : ''
        return `
          <div style="display: flex; flex-direction: column; align-items: end">
            <div>${value} ${row.unitOfMeasureCode || ''}</div>
            <div style="font-size: .8rem; color: var(--gray-700); word-wrap: nowrap;">${reserved}</div>
          </div>
        `
        // return `
        //   <div style="display: flex; flex-direction: column; align-items: end">
        //     <div>${parseFloat(value).toFixed(2)} ${row.unitOfMeasureCode || ''}</div>
        //     <div style="font-size: .8rem; color: var(--gray-700); word-wrap: nowrap;">${reserved}</div>
        //   </div>
        // `
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
        return '<a href="inventory/browser/details?itemId=[id]" class="router-link button link">Details</a>'
      },
      header: '&nbsp;',
      sortable: false,
      align: 'center'
    }
  }
})

const t2 = DataTable({
  target: '#invbro__movements_table',
  params: ['app/inventory/movement', 'list'],
  options: {
    title: 'Inventory Movements',
    action: {
      label: 'New Movement',
      href: '#/inventory/movement/edit'
    },
    orderCol: 'created_at',
    orderDir: 'desc',
    rowsPerPage: 10
  },
  columns: {
    movementType: {
      visible: true,
      header: 'Type',
      align: 'right',
      transform: (value, _row, _id) => {
        return `<app-badge>${formatSnakeCaseToTitle(value)}</app-badge>`
      }
    },
    productName: {
      visible: true,
      header: 'Product',
      align: 'left',
      transform: (value, row, _id) => {
        return value
          ? `
          <div style="display: flex; flex-direction: column; align-items: start">
            <div><strong>${value}</strong></div>
            <div style="font-size: .8rem; color: var(--gray-700)">${row.productCode || ''}</div>
            <div style="font-size: .8rem; color: var(--gray-700)">${row.vendorName || ''}</div>
          </div>`
          : '-'
      }
    },
    quantity: {
      visible: true,
      header: 'Quantity',
      align: 'right',
      transform: (value, row, _id) => {
        return (row.movementType === 'ISSUE' ? '-' : '') + preciseRound(parseFloat(value)) + ' ' + (row.unitOfMeasureCode || '')
      }
    },
    sourceLocationName: {
      visible: true,
      header: 'From',
      align: 'left',
      transform: (value, row, _id) => {
        return value ? `<div style="font-size: .9rem">${value}</div>` : '-'
      }
    },
    destinationLocationName: {
      visible: true,
      header: 'To',
      align: 'left',
      transform: (value, row, _id) => {
        return value ? `<div style="font-size: .9rem">${value}</div>` : '-'
      }
    },
    workOrderCode: {
      visible: true,
      header: 'Work Order',
      align: 'center'
    },
    reason: {
      visible: false,
      header: 'Reason',
      align: 'left',
      transform: (value, _row, _id) => {
        return value ? `<div style="font-size: .9rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${value}</div>` : '-'
      }
    },
    createdBy: {
      visible: true,
      header: 'Created by',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: end"><div>${value}</div><div style="font-size: .8rem">${i18nUnixToDate(row.createdAt)}</div></div>`
      },
      align: 'right'
    }
    // id: {
    //   visible: true,
    //   transform: (_value, _row, _id) => {
    //     return '<a href="inventory/movement/edit?movementId=[id]" class="router-link button link">View</a>'
    //   },
    //   header: '&nbsp;',
    //   sortable: false,
    //   align: 'center'
    // }
  }
})

const t3 = DataTable({
  target: '#invbro__reservations_table',
  params: ['app/inventory/reservation', 'list'],
  options: {
    title: 'Inventory Reservations',
    orderCol: 'reserved_at',
    orderDir: 'desc',
    rowsPerPage: 10
  },
  columns: {
    status: {
      visible: true,
      header: 'Status',
      align: 'center',
      transform: (value, _row, _id) => {
        return `<app-badge>${formatSnakeCaseToTitle(value)}</app-badge>`
      }
    },
    workOrderCode: {
      visible: true,
      header: 'WO',
      align: 'left',
      transform: (value, row, _id) => {
        return `
          <app-item-code code="${row.batchCode}">${row.workOrderCode}</app-item-code>
        `
      }
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
          </div>`
      }
    },
    lotCode: {
      visible: true,
      header: 'Lot',
      align: 'center'
    },
    quantity: {
      visible: true,
      header: 'Quantity',
      align: 'right',
      transform: (value, row, _id) => {
        return preciseRound(parseFloat(value)) + ' ' + (row.unitOfMeasureCode || '')
      }
    },
    locationName: {
      visible: false,
      header: 'Location',
      align: 'left',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: start"><div>${value}</div><div style="font-size: .8rem; color: var(--gray-700)">${row.locationCode}</div></div>`
      }
    },
    reservedByName: {
      visible: true,
      header: 'Reserved by',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: end"><div>${value}</div><div style="font-size: .8rem">${i18nUnixToDate(row.reservedAt)}</div></div>`
      },
      align: 'right'
    },
    releasedByName: {
      visible: true,
      header: 'Released by',
      transform: (value, row, _id) => {
        return value
          ? `<div style="display: flex; flex-direction: column; align-items: end"><div>${value}</div><div style="font-size: .8rem">${i18nUnixToDate(row.releasedAt)}</div></div>`
          : '-'
      },
      align: 'right'
    }
  }
})

// Reload table when data changes
eventsListen('event-table-data-changed', (event) => {
  if (event.table === 'inventory_item') {
    t1.reload()
  }
  if (event.table === 'inventory_movement') {
    t2.reload()
  }
  if (event.table === 'inventory_reservation') {
    t3.reload()
  }
})

export async function show (params) {
  log('View show', logContext)

  if (params.reload === 'true') {
    t1.reload()
  }

  $('#invibro__search').addEventListener('input', (event) => {
    console.log('event: ', event)
    t1.search(event.target.value)
  })

  $('#invmov__search').addEventListener('input', (event) => {
    t2.search(event.target.value)
  })
  $('#invres__search').addEventListener('input', (event) => {
    t3.search(event.target.value)
  })
}
export async function hide () {
  log('View hide', logContext)
}
