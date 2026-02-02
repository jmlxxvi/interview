import { log } from '../../../../../js/log.js'
import { $ } from '../../../../../js/dom.js'
import { i18nUnixToDate } from '../../../../../js/i18n.js'
import { eventsListen } from '../../../../../js/events.js'
import { DataTable } from '../../../../../components/Tables/DataTable.js'

const logContext = 'MASTERDATA:OPERATION:LIST'

const t1 = DataTable({
  target: '#mdaop__table',
  params: ['app/masterdata/operation', 'list'],
  options: {
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
    standardDuration: {
      visible: true,
      header: 'Duration (min)',
      transform: (value, row, _id) => {
        return value ? value.toString() : '-'
      },
      align: 'center'
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
        return '<a href="masterdata/operation/edit?operationId=[id]" class="router-link button link">Edit</a>'
      },
      header: '&nbsp;',
      sortable: false,
      align: 'center'
    },

    description: { visible: false },
    createdAt: { visible: false },
    updatedAt: { visible: false },
    updatedBy: { visible: false }
  }
})

// Reload table when data changes
eventsListen('event-table-data-changed', (event) => {
  if (event.table === 'operation') {
    t1.reload()
  }
})

export async function show (params) {
  log('View show', logContext)

  if (params.reload === 'true') {
    t1.reload()
  }

  $('#mdaop__search').addEventListener('input', (event) => {
    t1.search(event.target.value)
    console.log('Search changed ' + event.target.value)
  })
}

export async function hide () {
  log('View hide', logContext)
}
