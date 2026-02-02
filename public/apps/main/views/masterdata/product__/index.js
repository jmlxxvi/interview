import { log } from '../../../js/log.js'
import { $ } from '../../../js/dom.js'
import { i18nUnixToDate } from '../../../js/i18n.js'
import { eventsListen } from '../../../js/events.js'
import { DataTable } from '../../../components/Tables/DataTable.js'

const logContext = 'MASTERDATA:PRODUCTS:LIST'

const t1 = DataTable({
  target: '#mdaprd__table',
  params: ['app/masterdata/product', 'list'],
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
      header: 'Product',
      align: 'left',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: start"><div><strong>${value}</strong></div><div style="font-size: .8rem; color: var(--gray-700)">${row.code}</div></div>`
      }
    },
    unitOfMeasureCode: {
      visible: true,
      header: 'UOM',
      align: 'center'
    },
    shelfLifeDays: {
      visible: true,
      header: 'Shelf Life',
      transform: (value, row, _id) => {
        return value ? `${value} days` : '-'
      },
      align: 'center'
    },
    isOwn: {
      visible: true,
      header: 'Own',
      transform: (value, row, _id) => {
        return value ? '<img src="/images/icons/check2.svg" alt="Own" />' : '<img src="/images/icons/dot.svg" alt="Not own" />'
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
        return '<a href="masterdata/product/edit?productId=[id]" class="router-link button link">Edit</a>'
      },
      header: '&nbsp;',
      sortable: false,
      align: 'center'
    },

    description: { visible: false },
    unitOfMeasureId: { visible: false },
    unitOfMeasureName: { visible: false },
    isActive: { visible: false },
    createdAt: { visible: false },
    updatedAt: { visible: false },
    updatedBy: { visible: false }
  }
})

// Reload table when data changes
eventsListen('event-table-data-changed', (event) => {
  if (event.table === 'product') {
    t1.reload()
  }
})

export async function show (params) {
  log('View show', logContext)

  if (params.reload === 'true') {
    t1.reload()
  }

  $('#mdaprd__search').addEventListener('input', (event) => {
    t1.search(event.target.value)
    console.log('Search changed ' + event.target.value)
  })
}

export async function hide () {
  log('View hide', logContext)
}
