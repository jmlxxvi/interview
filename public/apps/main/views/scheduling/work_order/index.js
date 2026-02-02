import { log } from '../../../../../../js/log.js'
import { $ } from '../../../../../../js/dom.js'
import { i18nUnixToDate } from '../../../../../../js/i18n.js'
import { eventsListen } from '../../../../../../js/events.js'
import { DataTable } from '../../../../../../components/Tables/DataTable.js'
import { formatSnakeCaseToTitle } from '../../../../../../js/utils.js'
import { AlertBox, ConfirmBoxYesNo } from '../../../../../../components/Modal/Dialogs.js'
import { backendRpc } from '../../../../../../js/backend.js'

const logContext = 'MASTERDATA:WORK_ORDER:LIST'

const t1 = DataTable({
  target: '#schwor__table',
  params: ['app/scheduling/work_order', 'list'],
  options: {
    orderCol: 'created_at',
    orderDir: 'desc',
    rowsPerPage: 10,
    load: false
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
      transform: (value, _row, _id) => {
        // return '<a href="scheduling/work_order/edit?workOrderId=[id]" class="router-link button link">Edit</a>'
        return `
          <app-dropdown position="right">
            <button slot="toggle" class="dots-button" aria-label="More options">
                <img src="/images/icons/three-dots-vertical.svg" alt="More options">
            </button>
            <div slot="menu" class="dropdown-menu">
              <a href="scheduling/work_order/edit?workOrderId=[id]" class="dropdown-item router-link">Edit</a>
              <a href="#" class="schwor__clone_button dropdown-item" data-work-order-id="${value}">Clone</a>
            </div>
          </app-dropdown>`
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

document.body.addEventListener('click', async (event) => {
  if (event.target.matches('.schwor__clone_button')) {
    event.preventDefault()
    const workOrderId = event.target.getAttribute('data-work-order-id')

    const answer = await ConfirmBoxYesNo(
      'Confirm Clone',
      'Are you sure you want to clone this work order?'
    )

    if (answer) {
      log(`Cloning work order ${workOrderId}`, logContext)

      const response = await backendRpc(
        'app/scheduling/work_order',
        'clone',
        { workOrderId }
      )

      if (response.error) {
        AlertBox(response.message, 'error')
      } else {
        AlertBox(`Work order cloned successfully: ${response.data.workOrderCode}`, 'success')
        t1.reload()
        // eventsDispatch('event-table-data-changed', { table: 'work_order' })
      }
    }
  }
})

export async function show (params) {
  log('View show', logContext)

  t1.reload()
  if (params.reload === 'true') {
    t1.reload()
  }

  $('#schwor__search').addEventListener('input', (event) => {
    t1.search(event.target.value)
    console.log('Search changed ' + event.target.value)
  })
}

export async function hide () {
  log('View hide', logContext)
}
