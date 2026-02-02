// import config from "../../../assets/js/config.js";
import { log } from '../../../js/log.js'
import { backendRpc } from '../../../js/backend.js'
import { $ } from '../../../js/dom.js'
import { debounce } from '../../../js/utils.js'
// import { toastShow } from "../../components/Notifications/Toast.js";
// import { numberFormat, numberUnformat, i18nUnixToDate, date2unix } from "../../../assets/js/i18n.js";

import { i18nUnixToDate } from '../../../js/i18n.js'

import { eventsListen } from '../../../js/events.js'

// import { populateSelect } from "../../../assets/js/forms.js";

// import { fmanFormatTaxId } from '../../js/fman.js'

// import { fmanFormatTaxId } from '../../../js/fman.js'

import { DataTable } from '../../../components/Tables/DataTable.js'
import { AlertBox } from '../../../components/Modal/Dialogs.js'
// import { backendRpc } from '../../../js/backend.js'

const logContext = 'ADMIN:USERS:LIST'

const t1 = DataTable({
  target: '#users__table',
  params: ['backoffice/users', 'list'],
  options: {
    title: 'Usuarios',
    action: {
      label: 'Nuevo usuario',
      href: '#/admin/users/upload'
    },
    orderCol: 'full_name',
    orderDir: 'asc'
  },
  columns: {
    id: {
      visible: false,
      transform: (_value, _row, _id) => {
        return '<a href="#/[id]">Detalles</a>'
      },
      header: '&nbsp;',
      sortable: false
    },
    fullName: {
      visible: true,
      header: 'Usuario',
      align: 'left',
      transform: (value, row, _id) => {
        return `<strong>${value}</strong>`
      }
    },
    email: {
      visible: true,
      header: 'Correo electrónico',
      align: 'left',
      transform: (value, _row, _id) => {
        return `<a href="mailto:${value}">${value}</a>`
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
    createdAt: {
      visible: false,
      header: 'Creado en',

      transform: (value, row, _id) => {
        return i18nUnixToDate(value)
      }
    },
    isActive: {
      visible: true,
      header: 'Activo',
      transform: (value, _row, _id) => {
        const classes = 'cursor-pointer users__toggle_is_active'
        return value
          ? `<img src="/images/icons/check2.svg" alt="Yes" class="${classes}" data-id="[id]" />`
          : `<img src="/images/icons/dot.svg" alt="No" class="${classes}"  data-id="[id]" />`
      },
      align: 'center'
    },
    editId: {
      visible: true,
      transform: (_value, _row, _id) => {
        return '<a href="/users/edit?userId=[id]" class="router-link button link"><img src="/images/icons/edit-square.svg" alt="Edit" /></a>'
      },
      header: '&nbsp;',
      sortable: false,
      align: 'center'
    }
  }
})

document.body.addEventListener('click', async (e) => {
  if (e.target.classList.contains('users__toggle_is_active')) {
    const userId = e.target.getAttribute('data-id')
    if (!userId) {
      return
    }

    const response = await backendRpc('backoffice/users', 'toggleActive', {
      userId
    })

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      await t1.reload()
    }
  }

  // if (e.target.classList.contains('users__toggle_is_customer')) {
  //   const userId = e.target.getAttribute('data-id')
  //   if (!userId) {
  //     return
  //   }

  //   const response = await backendRpc('backoffice/users', 'toggleCustomer', {
  //     userId
  //   })

  //   if (response.status.error) {
  //     AlertBox(response.status.message, 'error')
  //   } else {
  //     await t1.reload()
  //   }
  // }
})

// Reload table when data changes
eventsListen('event-table-data-changed', (event) => {
  if (event.table === 'users') {
    t1.reload()
  }
})

export async function show (params) {
  // TODO send information to the backend about this
  log('View show', logContext)

  if (params.reload === 'true') {
    t1.reload()
  }

  $('#users__search').addEventListener('input', debounce((event) => {
    t1.search(event.target.value)
    console.log('Search changed ' + event.target.value)
  }, 400)) // 400ms delay is typical
}

export async function hide () {
  log('View hide', logContext)
}
