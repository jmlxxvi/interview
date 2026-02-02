// import config from "../../../assets/js/config.js";
import { log } from '../../../../../../js/log.js'
// import { backendRpc } from '../../js/backend.js'
import { $ } from '../../../../../../js/dom.js'
import { backendRpc } from '../../../../../../js/backend.js'
import { AlertBox, ConfirmBox } from '../../../../../../components/Modal/Dialogs.js'
import { routerNavigate } from '../../../../../../js/router.js'
import { isEmail } from '../../../../../../vendor/validator/lib/isEmail.js'
import { factoryFetchEntityCode } from '../../../../../../js/factory.js'

const logContext = 'NASTERDATA:VENDORS:EDIT'

let vendorId = null
let stateVendorCode = null

const vendorName = $('#mdavenedt__name')
const vendorCode = $('#mdavenedt__code')
const vendorEmail = $('#mdavenedt__email')
const submit = $('#mdavenedt__submit')
const remove = $('#mdavenedt__delete')

remove.addEventListener('click', async () => {
  const confirmed = await ConfirmBox('Are you sure?', 'confirm')
  console.log('confirmed: ', confirmed)
  if (!confirmed) {
    return
  }

  const response = await backendRpc(
    'app/masterdata/vendor',
    'remove',
    { vendorId }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/masterdata/vendor?reload=true')
  }
})

submit.action = async () => {
  if (!vendorName.value || vendorName.value.trim() === '') {
    AlertBox('Por favor ingrese el nombre de contacto.', 'error')
    return
  }

  if (!vendorEmail.value || vendorEmail.value.trim() === '') {
    AlertBox('Por favor ingrese el email de contacto.', 'error')
    return
  }

  if (!isEmail(vendorEmail.value)) {
    AlertBox('Por favor ingrese un email de contacto válido.', 'error')
    return
  }

  console.log('Submitting edit vendor: ', vendorId, vendorName.value, vendorEmail.value)

  const response = await backendRpc(
    'app/masterdata/vendor',
    'save',
    {
      vendorName: vendorName.value.trim(),
      vendorCode: stateVendorCode,
      vendorEmail: vendorEmail.value.trim(),
      vendorId
    }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/masterdata/vendor?reload=true')
  }
}

function viewReset () {
  vendorName.value = ''
  vendorCode.innerText = ''
  stateVendorCode = null
  vendorEmail.value = ''
}

export async function show (params) {
  vendorId = params.vendorId

  // TODO send information to the backend about this
  log('View show', logContext)

  viewReset()

  if (vendorId) {
    const response = await backendRpc(
      'app/masterdata/vendor',
      'findById',
      { vendorId }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      console.log('response', response)

      if (!response.data) {
        AlertBox('Vendor not found', 'error')
        routerNavigate('/masterdata/vendor?reload=true')
        return
      }

      vendorName.value = response.data.name
      stateVendorCode = response.data.code
      vendorCode.innerText = stateVendorCode
      vendorEmail.value = response.data.email
    }
  } else {
    stateVendorCode = await factoryFetchEntityCode('VEN')
    vendorCode.innerText = stateVendorCode
    console.log('Generated entity code: ', stateVendorCode)
  }
}

export async function hide () {
  log('View hide', logContext)
}
