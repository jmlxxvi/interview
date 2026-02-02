// import config from "./config.js";
import { $, $$ } from './js/dom.js'
import { securitySafeHtml } from './js/security.js'
// import { eventsListen } from './js/events.js'
import { routerGoToIndexPage } from './js/router.js'
import { backendRpc } from './js/backend.js'

import './components/Buttons/LoadingButton.js'

const urlParams = new URLSearchParams(window.location.search)
const action = urlParams.get('action')
// console.log('action: ', action)
const token = urlParams.get('token')
const email = urlParams.get('email')
const to = urlParams.get('to')

async function showForms (action) {
  // Hide all forms
  $$('.form-wrapper').forEach((form) => { form.style.display = 'none' })

  // Show the appropriate form
  if (action === 'recovery') {
    $('#login__recovery_form').style.display = 'block'
  } else if (action === 'reset') {
    $('#login__reset_form').style.display = 'block'
  } else if (action === 'create') {
    $('#login__create_form').style.display = 'block'
  } else if (action === 'verify') {
    const response = await backendRpc('app/auth/public', 'verify_email', { email, token })

    if (response.status.error) {
      showMessage(response.status.message)
    } else {
      if (email) {
        $('#login__email').value = email
      }

      $('#login__login_form').style.display = 'block'
    }

    $('#login__verify_form').style.display = 'block'
  } else { // Login
    if (email) {
      $('#login__email').value = email
    }

    $('#login__login_form').style.display = 'block'
  }

  $('#login__main_form').style.display = 'block'
}

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

// document.fonts.ready.then(() => {
document.addEventListener('DOMContentLoaded', async () => {
  // Login submit button

  /*

    const saveBtn = document.getElementById("saveBtn");
    saveBtn.action = async () => {
    await new Promise(res => setTimeout(res, 2000)); // simulate async save
    alert("Saved!");
    };
    */
  $('#login__submit').action = async () => {
    const response = await backendRpc(
      'app/auth/public',
      'login',
      {
        email: $('#login__email').value,
        password: $('#login__password').value
      }
    )

    if (response.status.error) {
      showMessage(response.status.message)
    } else {
      location.replace(to || '/')
    }
  }

  // Navigation links
  // $("#login__recovery_link").addEventListener("click", (event) => { event.preventDefault(); showForms("recovery"); }, "#login__recovery_link");
  // $("#login__recovery_back_link").addEventListener("click", (event) => { event.preventDefault(); showForms("login"); }, "#login__recovery_back_link");
  // $("#login__create_back_link").addEventListener("click", (event) => { event.preventDefault(); showForms("login"); }, "#login__create_back_link");
  // $("#login__create_link").addEventListener("click", (event) => { event.preventDefault(); showForms("create"); }, "#login__create_link");

  // Recovery
  $('#login__submit_recovery').action = async () => {
    const response = await backendRpc(
      'app/auth/public',
      'recovery',
      {
        email: $('#login__recovery_email').value
      }
    )

    if (response.status.error) {
      showMessage(response.status.message)
    } else {
      if (response.status.error) {
        showMessage(response.status.message)
      } else {
        showMessage('Email enviado')
      }
    }
  }

  // Reset
  $('#login__submit_reset').action = async () => {
    const password = $('#login__reset_password1').value
    const password2 = $('#login__reset_password2').value

    if (password !== password2) {
      showMessage('Las contraseñas no coinciden')
      return
    }

    if (password.length < 4) {
      showMessage('La contraseña debe tener al menos 4 caracteres')
      return
    }

    const response = await backendRpc('app/auth/public', 'reset', {
      token,
      password: $('#login__reset_password1').value
    })

    if (response.status.error) {
      showMessage(response.status.message)
    } else {
      showMessage('Contraseña restablecida')

      showForms('login')
    }
  }

  // New user
  $('#login__submit_create').addEventListener('click', async (event) => {
    event.preventDefault()

    const response = await backendRpc('app/client/public', 'new_user', {
      email: $('#login__create_email').value,
      full_name: $('#login__create_full_name').value,
      password: $('#login__create_password').value
    })

    if (response.status.error) {
      showMessage(response.status.message)
    } else {
      showMessage('Te enviamos un correo para que puedas iniciar sesión, por favor verifica tu correo')

      showForms('login')
    }
  })

  // Accept invitation
  $('#login__submit_invitation').addEventListener('click', async (event) => {
    event.preventDefault()

    const response = await backendRpc('app/client/public', 'invitation_accept', {
      token,
      full_name: $('#login__invitation_full_name').value,
      password: $('#login__invitation_password').value
    })

    if (response.status.error) {
      showMessage(response.status.message)
    } else {
      routerGoToIndexPage(to)
    }
  })

  showForms(action)
})
