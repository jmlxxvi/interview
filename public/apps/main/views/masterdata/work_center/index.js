import { log } from '../../../../../js/log.js'
import { $ } from '../../../../../js/dom.js'
import { i18nUnixToDate } from '../../../../../js/i18n.js'
import { eventsListen } from '../../../../../js/events.js'
import { DataTable } from '../../../../../components/Tables/DataTable.js'

const logContext = 'MASTERDATA:WORKCENTER:LIST'

const t1 = DataTable({
  target: '#mdawc__table',
  params: ['app/masterdata/work_center', 'list'],
  options: {
    title: 'Work Centers',
    action: {
      label: 'New Work Center',
      href: '#/masterdata/work_center/edit'
    },
    orderCol: 'code',
    orderDir: 'asc'
  },
  columns: {
    code: {
      visible: false,
      header: 'Code',
      align: 'left'
    },
    name: {
      visible: true,
      header: 'Name',
      align: 'left',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: start"><div><strong>${value}</strong></div><div style="font-size: .8rem; color: var(--gray-700)">${row.code}</div></div>`
      }
    },
    location: {
      visible: true,
      header: 'Location',
      align: 'left'
    },
    createdBy: {
      visible: true,
      header: 'Created',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: end"><div>${value}</div><div style="font-size: .8rem">${i18nUnixToDate(row.createdAt)}</div></div>`
      },
      align: 'right'
    },
    id: {
      visible: true,
      transform: (_value, _row, _id) => {
        return '<a href="masterdata/work_center/edit?workCenterId=[id]" class="router-link button link"><img src="/images/icons/edit-square.svg" alt="Edit" /></a>'
      },
      header: '&nbsp;',
      sortable: false,
      align: 'center'
    },

    description: { visible: false },
    isActive: { visible: false },
    createdAt: { visible: false },
    updatedAt: { visible: false },
    updatedBy: { visible: false }
  }
})

// Reload table when data changes
eventsListen('event-table-data-changed', (event) => {
  if (event.table === 'work_center') {
    t1.reload()
  }
})

export async function show (params) {
  log('View show', logContext)

  if (params.reload === 'true') {
    t1.reload()
  }

  $('#mdawc__search').addEventListener('input', (event) => {
    t1.search(event.target.value)
    console.log('Search changed ' + event.target.value)
  })
}

export async function hide () {
  log('View hide', logContext)
}
