import { log } from '../../../../../../js/log.js'
import { $ } from '../../../../../../js/dom.js'
import { backendRpc } from '../../../../../../js/backend.js'
import { AlertBox, ConfirmBox } from '../../../../../../components/Modal/Dialogs.js'
import { routerNavigate } from '../../../../../../js/router.js'
import { factoryFetchEntityCode } from '../../../../../../js/factory.js'

const logContext = 'MASTERDATA:OPERATION:EDIT'

let operationId = null

const code = $('#mdaopedt__code')
const name = $('#mdaopedt__name')
const standardDuration = $('#mdaopedt__standard_duration')
const description = $('#mdaopedt__description')
const submit = $('#mdaopedt__submit')
const remove = $('#mdaopedt__delete')

remove.addEventListener('click', async () => {
  const confirmed = await ConfirmBox('Are you sure you want to delete this operation?', 'confirm')
  if (!confirmed) {
    return
  }

  const response = await backendRpc(
    'app/masterdata/operation',
    'remove',
    { operationId }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/masterdata/operation?reload=true')
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
    'app/masterdata/operation',
    'save',
    {
      operationId,
      code: code.value.trim(),
      name: name.value.trim(),
      standardDuration: standardDuration.value ? parseInt(standardDuration.value) : null,
      description: description.value.trim()
    }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/masterdata/operation?reload=true')
  }
}

function viewReset () {
  code.value = ''
  name.value = ''
  standardDuration.value = ''
  description.value = ''
}

export async function show (params) {
  operationId = params.operationId

  remove.style.visibility = 'hidden'

  log('View show', logContext)

  viewReset()

  if (operationId) {
    remove.style.visibility = 'visible'

    const response = await backendRpc(
      'app/masterdata/operation',
      'find',
      { operationId }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      if (!response.data) {
        AlertBox('Operation not found', 'error')
        routerNavigate('/masterdata/operation?reload=true')
        return
      }

      code.value = response.data.code
      name.value = response.data.name
      standardDuration.value = response.data.standardDuration || ''
      description.value = response.data.description || ''
    }
  } else {
    const entityCode = await factoryFetchEntityCode('OPR')
    code.value = entityCode
    console.log('Generated entity code: ', entityCode)
  }
}

export async function hide () {
  log('View hide', logContext)
}
