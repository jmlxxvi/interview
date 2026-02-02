import { log } from '../../../../js/log.js'
import { $ } from '../../../../js/dom.js'
import { backendRpc } from '../../../../js/backend.js'
import { AlertBox, ConfirmBox } from '../../../../components/Modal/Dialogs.js'
import { routerNavigate } from '../../../../js/router.js'
// import '../../../../components/Select/RpcSelect.js'

const logContext = 'QUALITY:INSPECTION:EDIT'

let qualityInspectionId = null

const batchSelect = $('#qainsedt__batch')
const operationSelect = $('#qainsedt__operation')
const inspectedBySelect = $('#qainsedt__inspected_by')
const resultSelect = $('#qainsedt__result')
const notesTextarea = $('#qainsedt__notes')
const submit = $('#qainsedt__submit')
const remove = $('#qainsedt__delete')

remove.addEventListener('click', async () => {
  const confirmed = await ConfirmBox('Are you sure?', 'confirm')
  if (!confirmed) {
    return
  }

  const response = await backendRpc(
    'app/quality/inspection',
    'remove',
    { qualityInspectionId }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/quality/inspection?reload=true')
  }
})

submit.action = async () => {
  const batchId = batchSelect.value
  const operationId = operationSelect.value
  const inspectedBy = inspectedBySelect.value
  const result = resultSelect.value
  const notes = notesTextarea.value

  if (!result || result.trim() === '') {
    AlertBox('Please select a result.', 'error')
    return
  }

  const response = await backendRpc(
    'app/quality/inspection',
    'save',
    {
      qualityInspectionId,
      batchId: batchId || null,
      operationId: operationId || null,
      inspectedBy: inspectedBy || null,
      result: result.trim(),
      notes: notes.trim() || null
    }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/quality/inspection?reload=true')
  }
}

function viewReset () {
  if (batchSelect.clear) batchSelect.clear()
  if (operationSelect.clear) operationSelect.clear()
  if (inspectedBySelect.clear) inspectedBySelect.clear()
  resultSelect.value = 'PENDING'
  notesTextarea.value = ''
}

export async function show (params) {
  qualityInspectionId = params.qualityInspectionId

  log('View show', logContext)

  viewReset()

  if (qualityInspectionId) {
    const response = await backendRpc(
      'app/quality/inspection',
      'findById',
      { qualityInspectionId }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      if (!response.data) {
        AlertBox('Quality inspection not found', 'error')
        routerNavigate('/quality/inspection?reload=true')
        return
      }

      // Set batch
      if (response.data.batchId && batchSelect.setValue) {
        batchSelect.setValue({
          value: response.data.batchId,
          label: response.data.batchCode
        })
      }

      // Set operation
      if (response.data.operationId && operationSelect.setValue) {
        operationSelect.setValue({
          value: response.data.operationId,
          label: response.data.operationName
        })
      }

      // Set inspected by
      if (response.data.inspectedBy && inspectedBySelect.setValue) {
        inspectedBySelect.setValue({
          value: response.data.inspectedBy,
          label: response.data.inspectedByName
        })
      }

      resultSelect.value = response.data.result
      notesTextarea.value = response.data.notes || ''
    }
  }
}

export async function hide () {
  log('View hide', logContext)
}
