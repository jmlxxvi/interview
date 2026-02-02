import { log } from '../../../../../js/log.js'
import { $ } from '../../../../../js/dom.js'
import { i18nUnixToDate } from '../../../../../js/i18n.js'
import { eventsListen } from '../../../../../js/events.js'
import { DataTable } from '../../../../../components/Tables/DataTable.js'

const logContext = 'INVENTORY:LOCATION:LIST'

const t1 = DataTable({
  target: '#invloc__table',
  params: ['app/inventory/location', 'list'],
  options: {
    title: 'Inventory Locations',
    action: {
      label: 'New Location',
      href: '#/inventory/location/edit'
    },
    orderCol: 'created_at',
    orderDir: 'desc'
  },
  columns: {
    code: {
      visible: false,
      header: 'Code'
    },
    name: {
      visible: true,
      header: 'Location',
      align: 'left',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: start"><div><strong>${value}</strong></div><div style="font-size: .8rem; color: var(--gray-700)">${row.code}</div></div>`
      }
    },
    description: {
      visible: true,
      header: 'Description',
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
        return '<a href="inventory/location/edit?locationId=[id]" class="router-link button link">Edit</a>'
      },
      header: '&nbsp;',
      sortable: false,
      align: 'center'
    }
  }
})

// Reload table when data changes
eventsListen('event-table-data-changed', (event) => {
  if (event.table === 'inventory_location') {
    t1.reload()
  }
})

export async function show (params) {
  log('View show', logContext)

  if (params.reload === 'true') {
    t1.reload()
  }

  $('#invloc__search').addEventListener('input', (event) => {
    t1.search(event.target.value)
  })
}

export async function hide () {
  log('View hide', logContext)
}
