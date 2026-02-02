// import config from "./config.js";
import { $, $$ } from '../../js/dom.js'
import { securitySafeHtml } from '../../js/security.js'
// import { eventsListen } from './js/events.js'
import { routerGoToIndexPage } from '../../js/router.js'
import { storageSet } from '../../js/storage.js'
import { backendRpc } from '../../js/backend.js'

// import { fmanFormatTaxIdInput, fmanFormatTaxId, fmanUnformatTaxId } from '../js/fman.js'

import '../../components/Buttons/LoadingButton.js'

const urlParams = new URLSearchParams(window.location.search)
const action = urlParams.get('action')
console.log('action: ', action)
const token = urlParams.get('token')
const to = urlParams.get('to')

/**
 * Shows the login alert message by filling it with the given
 * message and setting the display style of the alert body to "block".
 * @param {string} message - the message to be shown in the alert
 */
function showMessage (message) {
  $('#login__alert_message').innerHTML = securitySafeHtml(message)
  $('#login__alert_body').style.display = 'block'
}

/**
 * Hides the login alert message by clearing its content
 * and setting the display style of the alert body to "none".
 */
// function hideMessage () {
//   $('#login__alert_message').innerHTML = ''
//   $('#login__alert_body').style.display = 'none'
// }

document.addEventListener('DOMContentLoaded', async () => {
  // Format the CUIT input

  $('#login__submit').action = async () => {
    const response = await backendRpc(
      'backoffice/auth/public',
      'login',
      {
        email: $('#login__email').value,
        password: $('#login__password').value
      }
    )

    if (response.status.error) {
      showMessage(response.status.message)
    } else {
      console.log(JSON.stringify(response, null, 2))
      storageSet('token', response.data.token)
      storageSet('context', 'user')

      location.replace('/backoffice')
    }
  }
})
