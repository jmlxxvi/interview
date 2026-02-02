import { log } from '../../js/log.js'
import { backendRpc } from '../../js/backend.js'
import { $ } from '../../js/dom.js'
import { AlertBox } from '../../components/Modal/Dialogs.js'

const logContext = 'FORMS:LIST'

const type = $('#help__type')
const message = $('#help__message')
const submit = $('#help__submit')

submit.addEventListener('click', async () => {
  const typeValue = type.value
  const messageValue = message.value

  const response = await backendRpc('app/help', 'help', {
    type: typeValue,
    message: messageValue
  })

  if (response.status.error) {
    AlertBox('Ocurrió un error al enviar el mensaje. Intente nuevamente más tarde.')
  } else {
    type.value = ''
    message.value = ''
    AlertBox('Mensaje enviado. Gracias por contactarnos.')
  }
})

export async function show (params) {
  console.log('params: ', params)
  // TODO send information to the backend about this
  log('View show', logContext)
}

export async function hide () {
  log('View hide', logContext)
}
