import { log } from '../../../../../js/log.js'
import { $ } from '../../../../../js/dom.js'
import { i18nUnixToDate } from '../../../../../js/i18n.js'
import { eventsListen } from '../../../../../js/events.js'
import { DataTable } from '../../../../../../components/Tables/DataTable.js'

const logContext = 'QUALITY:INSPECTION:LIST'

const resultBadges = {
  PENDING: '<span class="badge badge-warning">Pending</span>',
  PASS: '<span class="badge badge-success">Pass</span>',
  FAIL: '<span class="badge badge-danger">Fail</span>',
  REWORK: '<span class="badge badge-info">Rework</span>'
}

const t1 = DataTable({
  target: '#qainsp__table',
  params: ['app/quality/inspection', 'list'],
  options: {
    title: 'Quality Inspections',
    action: {
      label: 'New Inspection',
      href: '#/quality/inspection/edit'
    },
    orderCol: 'created_at',
    orderDir: 'desc'
  },
  columns: {
    batchCode: {
      visible: true,
      header: 'Batch',
      align: 'left'
    },
    operationName: {
      visible: true,
      header: 'Operation',
      align: 'left',
      transform: (value, row, _id) => {
        return value || '<span style="color: var(--gray-500)">—</span>'
      }
    },
    result: {
      visible: true,
      header: 'Result',
      align: 'center',
      transform: (value, _row, _id) => {
        return resultBadges[value] || value
      }
    },
    inspectedByName: {
      visible: true,
      header: 'Inspected By',
      align: 'left',
      transform: (value, _row, _id) => {
        return value || '<span style="color: var(--gray-500)">—</span>'
      }
    },
    createdBy: {
      visible: true,
      header: 'Created By',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: end"><div>${value}</div><div style="font-size: .8rem">${i18nUnixToDate(row.createdAt)}</div></div>`
      },
      align: 'right'
    },
    id: {
      visible: true,
      transform: (_value, _row, _id) => {
        return '<a href="quality/inspection/edit?qualityInspectionId=[id]" class="router-link button link">Edit</a>'
      },
      header: '&nbsp;',
      sortable: false,
      align: 'center'
    }
  }
})

// Reload table when data changes
eventsListen('event-table-data-changed', (event) => {
  if (event.table === 'quality_inspection') {
    t1.reload()
  }
})

export async function show (params) {
  log('View show', logContext)

  if (params.reload === 'true') {
    t1.reload()
  }

  $('#qainsp__search').addEventListener('input', (event) => {
    t1.search(event.target.value)
  })
}

export async function hide () {
  log('View hide', logContext)
}
