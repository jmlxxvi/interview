import { routerNavigate, routerStart } from '../../js/router.js'
import { backendRpc } from '../../js/backend.js'
// import { storageGet } from './js/storage.js';
import { $ } from '../../js/dom.js'
import { securityLogoff, securitySafeHtml } from '../../js/security.js'
import { eventsListen } from '../../js/events.js'
import { filesInit } from '../../js/files.js'
import { websocketsInit } from '../../js/websockets.js'
// import { stateSet } from './js/state.js'
import { initSidebarMenu } from '../../js/sidebar.js'

import '../../components/index.js'

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

    if (event.target.closest('.sidebar-nav a')) {
      sidebar.classList.remove('open')
    }

    if (event.target.closest('#sidebar-logout')) {
      securityLogoff('/')
    }
  })

  // Handle window resize
  window.addEventListener('resize', function () {
    if (window.innerWidth > 768) {
      sidebar.classList.remove('open')
    }
  })
  // Start the app
  const response = await backendRpc('app/auth/start', 'start')
  console.log('start response: ', response)

  if (response.status.error) {
    securityLogoff()
  } else {
    const { userName, plantName, plantCode, entityName, menu, token } = response.data

    initSidebarMenu(menu)

    if (userName) { // Logged in
      $('#sidebar-info').innerHTML = securitySafeHtml(`
            <div class="vstack">
                <div><strong>${userName}</strong></div>
                <div>${entityName}</div>
            </div>`)

      $('#header-plant').innerHTML = securitySafeHtml(`
            <div class="vstack ml-2">
                <div><strong>${plantName}</strong></div>
                <div style="font-size: smaller; text-align: right;">${plantCode}</div>
            </div>`)

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

      routerStart()

      filesInit()

      websocketsInit(token)

      eventsListen('websockets-message', (event) => {
        if (event.context === 'session-expired') {
          securityLogoff()
        }
      })

      $('.header-left').addEventListener('click', () => {
        routerNavigate('/')
      })

      // As this is a single page app, we need to handle the beforeunload event to show a confirmation dialog
      // addEventListener('beforeunload', (event) => {
      // // Recommended
      //   event.preventDefault()

      //   // Included for legacy support, e.g. Chrome/Edge < 119
      //   event.returnValue = true
      // })
    } else {
      securityLogoff()
    }
  }
})
