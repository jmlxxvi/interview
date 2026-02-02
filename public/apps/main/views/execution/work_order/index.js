import { log } from '../../../../../../../js/log.js'
import { $ } from '../../../../../../../../js/dom.js'
import { i18nUnixToDate } from '../../../../../../../../js/i18n.js'
import { eventsListen } from '../../../../../../../../js/events.js'
import { DataTable } from '../../../../../../../../components/Tables/DataTable.js'
import { formatSnakeCaseToTitle } from '../../../../../../../../js/utils.js'

const logContext = 'MASTERDATA:WORK_ORDER:LIST'

const t1 = DataTable({
  target: '#exewor__table',
  params: ['app/execution/work_order', 'list'],
  options: {
    load: false,
    orderCol: 'created_at',
    orderDir: 'desc'
  },
  columns: {
    status: {
      visible: true,
      header: 'Status',
      align: 'left',
      transform: (value, row, _id) => {
        return `<app-badge>${formatSnakeCaseToTitle(value)}</app-badge>`
      }
    },
    code: {
      visible: true,
      header: 'Code',
      align: 'left',
      transform: (value, row, _id) => {
        return `<strong>${value}</strong>`
      }
    },
    productId: {
      visible: true,
      header: 'Product',
      align: 'left',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: start"><div>${row.productName}</div><div style="font-size: .8rem; color: gray;">${row.productCode}</div></div>`
      }
    },
    productCode: { visible: false },
    productName: { visible: false },
    quantity: {
      visible: true,
      header: 'Quantity',
      transform: (value, row, _id) => {
        return `${value} ${row.unitOfMeasureCode}`
      },
      align: 'right'
    },
    unitOfMeasureId: { visible: false },
    unitOfMeasureCode: { visible: false },
    unitOfMeasureName: { visible: false },
    workCenterId: {
      visible: true,
      header: 'Work Center',
      transform: (value, row, _id) => {
        if (value) {
          return `<div style="display: flex; flex-direction: column; align-items: start"><div>${row.workCenterName}</div><div style="font-size: .8rem; color: gray;">${row.workCenterCode}</div></div>`
        } else {
          return '<span style="color: gray; font-style: italic;">(none)</span>'
        }
      },
      align: 'left'
    },
    workCenterCode: { visible: false },
    workCenterName: { visible: false },

    assignedEmployeeId: {
      visible: true,
      header: 'Assigned To',
      transform: (value, row, _id) => {
        if (value) {
          return `<div style="display: flex; flex-direction: column; align-items: end"><div>${row.assignedEmployeeName}</div></div>`
        } else {
          return '<span style="color: gray; font-style: italic;">(none)</span>'
        }
      },
      align: 'right'
    },
    assignedEmployeeName: { visible: false },
    createdBy: {
      visible: true,
      header: 'Created By',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: end"><div>${value}</div><div style="font-size: .8rem">${i18nUnixToDate(row.createdAt)}</div></div>`
      },
      align: 'right'
    },
    createdAt: { visible: false },
    updatedAt: { visible: false },
    updatedBy: { visible: false },
    id: {
      visible: true,
      transform: (_value, _row, _id) => {
        return '<a href="execution/work_order/details?workOrderId=[id]" class="router-link button link">Details</a>'
      },
      header: '&nbsp;',
      sortable: false,
      align: 'center'
    }
  }
})

// Reload table when data changes
eventsListen('event-table-data-changed', (event) => {
  if (event.table === 'work_order') {
    t1.reload()
  }
})

eventsListen('websockets-message', (event) => {
  if (event.context === 'entity-modified' && event.data.name === 'workOrder') {
    t1.reload()
  }
})

/*
    await webSocketsService.broadcastMessage(entityId, plantId, {
      context: 'entity-modified',
      data: {
        name: 'workOrder',
        id: workOrderId
      }
    }, context.token)
*/

export async function show (params) {
  log('View show', logContext)

  t1.reload()
  // if (params.reload === 'true') {
  // }

  $('#exewor__search').addEventListener('input', (event) => {
    t1.search(event.target.value)
    console.log('Search changed ' + event.target.value)
  })
}

export async function hide () {
  log('View hide', logContext)
}
