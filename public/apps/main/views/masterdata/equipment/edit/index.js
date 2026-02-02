import { log } from '../../../../../../js/log.js'
import { $ } from '../../../../../../js/dom.js'
import { backendRpc } from '../../../../../../js/backend.js'
import { AlertBox, ConfirmBox } from '../../../../../../components/Modal/Dialogs.js'
import { routerNavigate } from '../../../../../../js/router.js'
import { factoryFetchEntityCode } from '../../../../../../js/factory.js'

const logContext = 'MASTERDATA:EQUIPMENT:EDIT'

let equipmentId = null

const code = $('#mdaeqpedt__code')
const name = $('#mdaeqpedt__name')
const workCenter = $('#mdaeqpedt__work_center')
const status = $('#mdaeqpedt__status')
const submit = $('#mdaeqpedt__submit')
const remove = $('#mdaeqpedt__delete')

remove.addEventListener('click', async () => {
  const confirmed = await ConfirmBox('Are you sure you want to delete this equipment?', 'confirm')
  if (!confirmed) {
    return
  }

  const response = await backendRpc(
    'app/masterdata/equipment',
    'remove',
    { equipmentId }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/masterdata/equipment?reload=true')
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
    'app/masterdata/equipment',
    'save',
    {
      equipmentId,
      code: code.value.trim(),
      name: name.value.trim(),
      workCenterId: workCenter.value || null,
      status: status.value
    }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/masterdata/equipment?reload=true')
  }
}

function viewReset () {
  code.value = ''
  name.value = ''
  workCenter.value = ''
  status.value = 'AVAILABLE'
}

async function loadWorkCenters () {
  const response = await backendRpc(
    'app/masterdata/work_center',
    'findAll',
    {}
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
    return
  }

  // Clear existing options except the first one
  workCenter.innerHTML = '<option value="">Select work center</option>'

  // Add options
  response.data.forEach(wc => {
    const option = document.createElement('option')
    option.value = wc.id
    option.textContent = `${wc.code} - ${wc.name}`
    workCenter.appendChild(option)
  })
}

export async function show (params) {
  equipmentId = params.equipmentId

  remove.style.visibility = 'hidden'

  log('View show', logContext)

  viewReset()
  await loadWorkCenters()

  if (equipmentId) {
    remove.style.visibility = 'visible'

    const response = await backendRpc(
      'app/masterdata/equipment',
      'find',
      { equipmentId }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      if (!response.data) {
        AlertBox('Equipment not found', 'error')
        routerNavigate('/masterdata/equipment?reload=true')
        return
      }

      code.value = response.data.code
      name.value = response.data.name
      workCenter.value = response.data.workCenterId || ''
      status.value = response.data.status
    }
  } else {
    // New equipment - generate code
    const entityCode = await factoryFetchEntityCode('EQP')
    code.value = entityCode
  }
}

export async function hide () {
  log('View hide', logContext)
}
