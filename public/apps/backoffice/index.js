import { routerNavigate, routerStart, routerGoToPage } from '../../js/router.js'
import { backendRpc } from '../../js/backend.js'
// import { storageGet } from '../../js/storage.js';
import { $ } from '../../js/dom.js'
import { securitySafeHtml } from '../../js/security.js'
import { eventsListen } from '../../js/events.js'
import { filesInit } from '../../js/files.js'
// import { stateSet } from '../../js/state.js'

// import '../../components/Counter2.js'
// import '../../components/Select/Select.js'
// import '../../components/Dropdown/Dropdown.js'
// import '../../components/Buttons/LoadingButton.js'
// import '../../components/Forms/Search.js'
// import '../../components/Forms/RPCSelect.js'
// import '../../components/Indicators/ProgressBar.js'
// import '../../components/Forms/ToggleSwitch.js'
// import '../../components/Time/Datepicker.js'
// import '../../components/Collapsible/Collapsible.js'
// import '../../components/Forms/selects/DataSelect.js'

// import '../../components/FiscoMan/Card.js'

// import { fmanFormatTaxId } from '../../js/fman.js'

import '../../components/index.js'

function securityLogoff () {
  backendRpc('backoffice/auth/public', 'logoff')

  routerGoToPage('/backoffice/login.html')
}

window.addEventListener('DOMContentLoaded', async () => {
  // Index page logic
  const menuToggle = document.getElementById('menuToggle')
  const sidebar = document.getElementById('sidebar')

  menuToggle.addEventListener('click', function () {
    sidebar.classList.toggle('open')
  })

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', function (event) {
    if (window.innerWidth <= 768) {
      const isClickInsideSidebar = sidebar.contains(event.target)
      const isClickOnToggle = menuToggle.contains(event.target)

      if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open')
      }
    }

    const target = event.target.closest('.sidebar-nav a')

    if (target) {
      sidebar.classList.remove('open')
    }

    const target2 = event.target.closest('#sidebar-logout')

    if (target2) {
      securityLogoff()
    }
  })

  // Handle window resize
  window.addEventListener('resize', function () {
    if (window.innerWidth > 768) {
      sidebar.classList.remove('open')
    }
  })
  // Start the app
  const response = await backendRpc('backoffice/auth/start', 'start')

  if (response.status.error) {
    securityLogoff()
  } else {
    const { userName } = response.data

    $('#sidebar-info').innerHTML = securitySafeHtml(`<div><strong>${userName}</strong></div>`)

    // RPC spinner
    const $spinner = $('.spinner')

    eventsListen('event-rpc-call-start', () => {
      $spinner.style.display = 'block'
    })

    eventsListen('event-rpc-call-end', (event) => {
      $spinner.style.display = 'none'

      // If the server returned an unauthorized error, redirect to login
      // This is a common pattern to handle session expiration or invalid tokens
      if (event.status?.code === 1002) { // Unauthorized
        return securityLogoff()
      }
    })

    routerStart('/backoffice')

    filesInit()

    $('.header-left').addEventListener('click', () => {
      routerNavigate('/backoffice')
    })

    // As this is a single page app, we need to handle the beforeunload event to show a confirmation dialog
    addEventListener('beforeunload', (event) => {
      // Recommended
      event.preventDefault()

      // Included for legacy support, e.g. Chrome/Edge < 119
      event.returnValue = true
    })
  }
})
