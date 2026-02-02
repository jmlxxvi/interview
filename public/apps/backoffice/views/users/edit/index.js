// import config from "../../../assets/js/config.js";
import { log } from '../../../../js/log.js'
// import { backendRpc } from '../../js/backend.js'
import { $ } from '../../../../js/dom.js'
import { backendRpc } from '../../../../js/backend.js'
import { AlertBox, ConfirmBox } from '../../../../components/Modal/Dialogs.js'
import { DataSelect } from '../../../../components/Forms/selects/DataSelect.js'
// public/components/Forms/selects/DataSelect.js
// import { fmanFormatTaxId } from '../../../../js/fman.js'
import { routerNavigate } from '../../../../js/router.js'
import { isEmail } from '../../../../vendor/validator/lib/isEmail.js'

const logContext = 'users:EDIT'

let userId = null

const nodeUserName = $('#users_edit__user_name')
// const nodeUserId = $('#users_edit__user_id')
const nodeUserEmail = $('#users_edit__user_email')
const nodeIsActive = $('#users_edit__is_active')
const submit = $('#users_edit__submit')
const remove = $('#users_edit__delete')

remove.addEventListener('click', async () => {
  const confirmed = await ConfirmBox('¿Está seguro que desea eliminar este usuario?')
  if (!confirmed) {
    return
  }

  const response = await backendRpc(
    'backoffice/users',
    'deleteUser',
    { userId }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/users?reload=true')
  }
})

const usersEditRoles = DataSelect({
  target: '#users_edit__roles',
  options: {
    load: true,
    multiselect: true,
    rpc: {
      mod: 'backoffice/auth/rbac/roles',
      fun: 'lookup'
    }
  }
})

const usersEditEntities = DataSelect({
  target: '#users_edit__entities',
  options: {
    load: false,
    multiselect: true,
    rpc: {
      mod: 'backoffice/users',
      fun: 'userEntitiesLookup',
      args: () => { return { userId } }
    },
    searchOnBackend: true
  }
})

submit.action = async () => {
  if (!nodeUserName.value || nodeUserName.value.trim() === '') {
    AlertBox('Por favor ingrese el nombre de usuario.', 'error')
    return
  }

  if (!nodeUserEmail.value || nodeUserEmail.value.trim() === '') {
    AlertBox('Por favor ingrese el email de usuario.', 'error')
    return
  }
  if (!isEmail(nodeUserEmail.value)) {
    AlertBox('Por favor ingrese un email válido.', 'error')
    return
  }

  const response = await backendRpc(
    'backoffice/users',
    'editUserSave',
    {
      userId,
      userName: nodeUserName.value,
      userEmail: nodeUserEmail.value,
      userIsActive: nodeIsActive.checked,
      userRoles: usersEditRoles.getSelectedKeys(),
      userEntities: usersEditEntities.getSelectedKeys()
    }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/users?reload=true')
  }
}

function viewReset () {
  nodeUserName.value = ''
  nodeUserEmail.value = ''
  usersEditRoles.reset()
  usersEditEntities.reset()
  nodeIsActive.checked = false
}

export async function show (params) {
  userId = params.userId
  // TODO send information to the backend about this
  log('View show', logContext)

  viewReset()

  if (userId) {
    const response = await backendRpc(
      'backoffice/users',
      'find',
      { userId }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      if (!response.data) {
        AlertBox('Usuario no encontrado', 'error')
        routerNavigate('/users')
        return
      }

      const roles = response.data.roles.map(x => x.id)

      const entities = response.data.entities.map(x => x.id)

      nodeIsActive.checked = response.data.isActive
      nodeUserName.value = response.data.userName
      nodeUserEmail.value = response.data.email

      usersEditRoles.setSelected(roles || [])
      usersEditRoles.reload()

      usersEditEntities.setArgs({ userId }, true)
      usersEditEntities.setSelected(entities || [])
      usersEditEntities.reload()
    }
  }
}
export async function hide () {
  log('View hide', logContext)
}
