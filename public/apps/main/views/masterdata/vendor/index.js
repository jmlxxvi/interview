// import config from "../../../assets/js/config.js";
import { log } from '../../../../../js/log.js'
import { $ } from '../../../../../js/dom.js'
import { i18nUnixToDate } from '../../../../../js/i18n.js'
import { eventsListen } from '../../../../../js/events.js'
import { DataTable } from '../../../../../../components/Tables/DataTable.js'

const logContext = 'MASTERDATA:VENDORS:LIST'

const t1 = DataTable({
  target: '#mdaven__table',
  params: ['app/masterdata/vendor', 'list'],
  options: {
    title: 'Certificados',
    action: {
      label: 'Nuevo certificado',
      href: '#/masterdata/vendor/edit'
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
      header: 'Vendor',
      align: 'left',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: start"><div><strong>${value}</strong></div><div style="font-size: .8rem; color: var(--gray-700)">${row.code}</div></div>`
      }
    },
    email: {
      visible: true,
      header: 'Email'
    },
    createdBy: {
      visible: true,
      header: 'Creado por',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: end"><div>${value}</div><div style="font-size: .8rem">${i18nUnixToDate(row.createdAt)}</div></div>`
      },
      align: 'right'
    },
    id: {
      visible: true,
      transform: (_value, _row, _id) => {
        return '<a href="masterdata/vendor/edit?vendorId=[id]" class="router-link button link">Edit</a>'
      },
      header: '&nbsp;',
      sortable: false,
      align: 'center'
    }

    // taxId: { visible: false },
    // contactName: { visible: false },
    // phone: { visible: false },
    // address: { visible: false },
    // city: { visible: false },
    // state: { visible: false },
    // country: { visible: false },
    // postalCode: { visible: false },
    // isActive: { visible: false },
    // createdAt: { visible: false },
    // updatedAt: { visible: false },
    // updatedBy: { visible: false }
  }
})

// Reload table when data changes
eventsListen('event-table-data-changed', (event) => {
  if (event.table === 'vendor') {
    t1.reload()
  }
})

export async function show (params) {
  log('View show', logContext)

  // const param = params[0]

  if (params.reload === 'true') {
    t1.reload()
  }

  $('#mdaven__search').addEventListener('input', (event) => {
    t1.search(event.target.value)
    console.log('Search changed ' + event.target.value)
  })
}

export async function hide () {
  log('View hide', logContext)
}
