import { log } from '../../../../../js/log.js'
import { $ } from '../../../../../js/dom.js'
import { i18nUnixToDate } from '../../../../../js/i18n.js'
import { eventsListen } from '../../../../../js/events.js'
import { DataTable } from '../../../../../components/Tables/DataTable.js'

const logContext = 'MASTERDATA:UOM:LIST'

const t1 = DataTable({
  target: '#mdauom__table',
  params: ['app/masterdata/unit_of_measure', 'list'],
  options: {
    title: 'Units of Measure',
    action: {
      label: 'New Unit',
      href: '#/masterdata/unit_of_measure/edit'
    },
    orderCol: 'code',
    orderDir: 'asc',
    rowsPerPage: 10
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
        return `<div style="display: flex; flex-direction: column; align-items: start"><div><strong>${value}</strong></div><div style="font-size: 1rem; color: var(--gray-700)">${row.code}</div></div>`
      }
    },
    category: {
      visible: true,
      header: 'Category',
      align: 'left'
    },
    isBase: {
      visible: true,
      header: 'Base Unit',
      transform: (value, row, _id) => {
        return value ? '<img src="/images/icons/check2.svg" alt="Base Unit" />' : '<img src="/images/icons/dot.svg" alt="Not Base Unit" />'
      },
      align: 'center'
    },
    baseUnitName: {
      visible: true,
      header: 'Base Unit',
      align: 'left'
    },
    conversionFactor: {
      visible: true,
      header: 'Factor',
      align: 'right'
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
        return '<a href="masterdata/unit_of_measure/edit?unitId=[id]" class="router-link button link">Edit</a>'
      },
      header: '&nbsp;',
      sortable: false,
      align: 'center'
    },

    description: { visible: false },
    baseUnitId: { visible: false },
    createdAt: { visible: false },
    updatedAt: { visible: false },
    updatedBy: { visible: false }
  }
})

// Reload table when data changes
eventsListen('event-table-data-changed', (event) => {
  if (event.table === 'unit_of_measure') {
    t1.reload()
  }
})

export async function show (params) {
  log('View show', logContext)

  if (params.reload === 'true') {
    t1.reload()
  }

  $('#mdauom__search').addEventListener('input', (event) => {
    t1.search(event.target.value)
    console.log('Search changed ' + event.target.value)
  })
}

export async function hide () {
  log('View hide', logContext)
}
