import { log } from '../../../../../../js/log.js'
import { $ } from '../../../../../../js/dom.js'
import { backendRpc } from '../../../../../../js/backend.js'
import { AlertBox, ConfirmBox } from '../../../../../../components/Modal/Dialogs.js'
import { routerNavigate } from '../../../../../../js/router.js'
import { factoryFetchEntityCode } from '../../../../../../js/interview.js'

const logContext = 'INVENTORY:LOCATION:EDIT'

let locationId = null
let stateLocationCode = null

const locationName = $('#invlocedt__name')
const locationCode = $('#invlocedt__code')
const locationDescription = $('#invlocedt__description')
const submit = $('#invlocedt__submit')
const remove = $('#invlocedt__delete')

remove.addEventListener('click', async () => {
  const confirmed = await ConfirmBox('Are you sure?', 'confirm')
  if (!confirmed) {
    return
  }

  const response = await backendRpc(
    'app/inventory/location',
    'remove',
    { locationId }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/inventory/location?reload=true')
  }
})

submit.action = async () => {
  if (!locationName.value || locationName.value.trim() === '') {
    AlertBox('Please enter the location name.', 'error')
    return
  }

  const response = await backendRpc(
    'app/inventory/location',
    'save',
    {
      locationName: locationName.value.trim(),
      locationCode: stateLocationCode,
      locationDescription: locationDescription.value.trim(),
      locationId
    }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/inventory/location?reload=true')
  }
}

function viewReset () {
  locationName.value = ''
  locationCode.innerText = ''
  stateLocationCode = null
  locationDescription.value = ''
}

export async function show (params) {
  locationId = params.locationId

  log('View show', logContext)

  viewReset()

  if (locationId) {
    const response = await backendRpc(
      'app/inventory/location',
      'findById',
      { locationId }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      if (!response.data) {
        AlertBox('Location not found', 'error')
        routerNavigate('/inventory/location?reload=true')
        return
      }

      locationName.value = response.data.name
      stateLocationCode = response.data.code
      locationCode.innerText = stateLocationCode
      locationDescription.value = response.data.description || ''
    }
  } else {
    stateLocationCode = await factoryFetchEntityCode('LOC')
    locationCode.innerText = stateLocationCode
  }
}

export async function hide () {
  log('View hide', logContext)
}
