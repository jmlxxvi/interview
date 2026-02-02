import { log } from '../../../../../../js/log.js'
import { $ } from '../../../../../../js/dom.js'
import { backendRpc } from '../../../../../../js/backend.js'
import { AlertBox, ConfirmBox } from '../../../../../../components/Modal/Dialogs.js'
import { routerNavigate } from '../../../../../../js/router.js'
import { factoryFetchEntityCode } from '../../../../../../js/factory.js'

const logContext = 'MASTERDATA:WORKCENTER:EDIT'

let workCenterId = null

const code = $('#mdawcedt__code')
const name = $('#mdawcedt__name')
const location = $('#mdawcedt__location')
const description = $('#mdawcedt__description')
const submit = $('#mdawcedt__submit')
const remove = $('#mdawcedt__delete')

remove.addEventListener('click', async () => {
  const confirmed = await ConfirmBox('Are you sure you want to delete this work center?', 'confirm')
  if (!confirmed) {
    return
  }

  const response = await backendRpc(
    'app/masterdata/work_center',
    'remove',
    { workCenterId }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/masterdata/work_center?reload=true')
  }
})

submit.action = async () => {
  if (!code.value || code.value.trim() === '') {
    AlertBox('Please enter a code.', 'error')
    return
  }

  if (!name.value || name.value.trim() === '') {
    AlertBox('Please enter a name.', 'error')
    return
  }

  const response = await backendRpc(
    'app/masterdata/work_center',
    'save',
    {
      workCenterId,
      code: code.value.trim(),
      name: name.value.trim(),
      location: location.value.trim(),
      description: description.value.trim()
    }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/masterdata/work_center?reload=true')
  }
}

function viewReset () {
  code.value = ''
  name.value = ''
  location.value = ''
  description.value = ''
}

export async function show (params) {
  workCenterId = params.workCenterId

  log('View show', logContext)

  viewReset()

  if (workCenterId) {
    const response = await backendRpc(
      'app/masterdata/work_center',
      'find',
      { workCenterId }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      if (!response.data) {
        AlertBox('Work center not found', 'error')
        routerNavigate('/masterdata/work_center?reload=true')
        return
      }

      code.value = response.data.code
      name.value = response.data.name
      location.value = response.data.location || ''
      description.value = response.data.description || ''
    }
  } else {
    const entityCode = await factoryFetchEntityCode('WKC')
    code.value = entityCode
    console.log('Generated entity code: ', entityCode)
  }
}

export async function hide () {
  log('View hide', logContext)
}
