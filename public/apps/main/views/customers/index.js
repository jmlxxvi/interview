// import config from "../../../assets/js/config.js";
import { log } from '../../js/log.js'
// import { backendRpc } from '../../js/backend.js'
import { $ } from '../../js/dom.js'
// import { toastShow } from "../../components/Notifications/Toast.js";
// import { numberFormat, numberUnformat, i18nUnixToDate, date2unix } from "../../../assets/js/i18n.js";

import { i18nUnixToDate } from '../../js/i18n.js'

import { eventsListen } from '../../js/events.js'

// import { populateSelect } from "../../../assets/js/forms.js";

// import { fmanFormatTaxId } from '../../js/fman.js'

import { fmanFormatTaxId } from '../../js/fman.js'

import { DataTable } from '../../components/Tables/DataTable.js'
// import { AlertBox } from '../../components/Modal/Dialogs.js'
// import { backendRpc } from '../../js/backend.js'

const logContext = 'ADMIN:USERS:LIST'

const t1 = DataTable({
  target: '#customers__table',
  params: ['app/customers', 'list'],
  options: {
    title: 'Certificados',
    action: {
      label: 'Nuevo certificado',
      href: '#/admin/certificates/upload'
    },
    orderCol: 'created_at',
    orderDir: 'desc'
  },
  columns: {
    entityId: {
      visible: false,
      transform: (_value, _row, _id) => {
        return '<a href="#/[id]">Detalles</a>'
      },
      header: '&nbsp;',
      sortable: false
    },
    entityName: {
      visible: true,
      header: 'Entidad',
      align: 'left',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: start"><div><strong>${value}</strong></div><div class="mt-1" style="font-size: .8rem">${fmanFormatTaxId(row.entityId)}</div></div>`
      }
    },
    createdBy: {
      visible: true,
      header: 'Creado por',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: end"><div>${value}</div><div style="font-size: .8rem">${i18nUnixToDate(row.createdAt)}</div></div>`
      },
      align: 'right'
    },
    entityAddress: {
      visible: false,
      header: 'Dirección'
    },
    contactName: {
      visible: true,
      header: 'Contacto',
      transform: (value, row, _id) => {
        return `<div style="display: flex; flex-direction: column; align-items: start"><div><strong>${value}</strong></div><div class="mt-1" style="font-size: .8rem">${row.contactEmail}</div></div>`
      },
      align: 'left'
    },
    contactEmail: {
      visible: false,
      header: 'Correo'
    },
    createdAt: {
      visible: false,
      header: 'Creado en',

      transform: (value, row, _id) => {
        return i18nUnixToDate(value)
      }
    },
    createdById: {
      visible: false,
      header: ''
    },
    editId: {
      visible: true,
      transform: (_value, _row, _id) => {
        return '<a href="/customers/edit?customerId=[entityId]" class="router-link button link"><img src="/images/icons/edit-square.svg" alt="Edit" /></a>'
      },
      header: '&nbsp;',
      sortable: false,
      align: 'center'
    }
  }
})

// Reload table when data changes
eventsListen('event-table-data-changed', (event) => {
  if (event.table === 'customers') {
    t1.reload()
  }
})

export async function show (params) {
  // TODO send information to the backend about this
  log('View show', logContext)

  // const param = params[0]

  if (params.reload === 'true') {
    t1.reload()
  }

  // console.log($("ooo#xxxx"));

  // $(`#xxxx`).addEventListener("click", (event) => {

  //     console.log("Search clicked", event);
  // });

  $('#customers__search').addEventListener('input', (event) => {
    t1.search(event.target.value)
    console.log('Search changed ' + event.target.value)
  })
}

export async function hide () {
  log('View hide', logContext)
}
