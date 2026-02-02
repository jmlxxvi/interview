import { $, $$ } from './dom.js'
import { log } from './log.js'

const loadedViews = {}
let currentViewId = null

function pathToSnakeCase (path) {
  const cleaned = path.replace(/^\/|\/$/g, '')
  const segments = cleaned.split('/')
  return segments.join('_')
}

function searchParamsToObject (searchParams) {
  const obj = {}
  for (const [key, value] of searchParams.entries()) {
    if (obj[key] !== undefined) {
      if (!Array.isArray(obj[key])) {
        obj[key] = [obj[key]]
      }
      obj[key].push(value)
    } else {
      obj[key] = value
    }
  }
  return obj
}

// Extract app name from URL (first path segment after domain)
function getCurrentAppName () {
  const pathSegments = window.location.pathname.split('/').filter(Boolean)
  return pathSegments[0] || 'main'
}

// Extract view path (everything after app name)
function getViewPath () {
  const appName = getCurrentAppName()
  const pathSegments = window.location.pathname.split('/').filter(Boolean)

  // Remove app name from segments
  if (pathSegments[0] === appName) {
    pathSegments.shift()
  }

  // Join remaining segments
  const viewPath = '/' + pathSegments.join('/')

  // If no view path, return '/default'
  if (viewPath === '/') {
    return '/default'
  }

  return viewPath
}

// Get full base path for assets (including app name)
function getAssetBaseUrl () {
  const url = new URL(window.location.href)
  const appName = getCurrentAppName()
  return `${url.origin}/apps/${appName}`
}

export function routerShowViewSpinner (skipView = false) {
  if (!skipView && currentViewId) {
    $(`#${currentViewId}`).style.display = 'none'
  }
  $('#loading-screen').style.display = 'flex'
}

export function routerHideViewSpinner (skipView = false) {
  $('#loading-screen').style.display = 'none'
  if (!skipView && currentViewId) {
    $(`#${currentViewId}`).style.display = 'block'
  }
}

async function renderRoute () {
  const url = new URL(window.location.href)
  const params = searchParamsToObject(url.searchParams)

  const viewPath = getViewPath()
  console.log('viewPath: ', viewPath)
  const viewId = 'view_' + pathToSnakeCase(viewPath)
  currentViewId = viewId

  const baseUrl = getAssetBaseUrl()
  console.log('baseUrl: ', baseUrl)
  const assetUrl = `${baseUrl}/views${viewPath}`

  // Hide all views
  const views = $$('.view')
  views.forEach((view) => { view.style.display = 'none' })

  if (loadedViews[viewId]) {
    routerHideViewSpinner(true)
    $(`#${viewId}`).style.display = 'block'
    loadedViews[viewId]?.show && await loadedViews[viewId].show(params)
  } else {
    routerShowViewSpinner(true)

    try {
      // CSS
      const cssFile = `${assetUrl}/styles.css`
      const head = document.getElementsByTagName('head')[0]
      const style = document.createElement('link')
      style.href = cssFile
      style.type = 'text/css'
      style.rel = 'stylesheet'
      head.append(style)

      // HTML
      const htmlFile = `${assetUrl}/index.html`
      const response = await fetch(htmlFile)

      if (!response.ok) {
        log(`View not found: ${htmlFile}`, 'router')
        // Try to navigate to error page
        // if (viewPath !== '/errors/404') {
        //   routerNavigate('/errors/404', { replace: true })
        // }
        return
      }

      const html = await response.text()
      $('.app-main').insertAdjacentHTML('beforeend', `<div id="${viewId}" class="view">${html}</div>`)

      // JS
      const jsFile = `${assetUrl}/index.js`
      const moduleApi = await import(jsFile)

      loadedViews[viewId] = {
        loaded: true,
        show: moduleApi.show
      }

      loadedViews[viewId]?.show && loadedViews[viewId].show(params)
      routerHideViewSpinner(true)
      $(`#${viewId}`).style.display = 'block'
    } catch (error) {
      // Handle errors appropriately
      const errorViewId = 'view_errors_network'
      if (!$(`#${errorViewId}`)) {
        $('.app-main').insertAdjacentHTML('beforeend',
          `<div id="${errorViewId}" class="view" style="display: none;">
             <div id="errors_network_message"></div>
           </div>`
        )
      }
      $('#errors_network_message').innerHTML = error.message + '<br>' + error.stack.replace('\n', '<br>') || ''
      $(`#${errorViewId}`).style.display = 'block'
      routerHideViewSpinner(true)

      console.error('Error loading view:', error)
    }
  }
}

export function routerNavigate (pathWithQuery, { replace = false } = {}) {
  const currentApp = getCurrentAppName()
  const basePath = `/${currentApp}/`

  // Create a URL object to normalize the path and query
  const url = new URL(basePath + pathWithQuery, window.location.origin)
  const newUrl = url.pathname + url.search

  // Only push/replace if the URL actually changed
  if (window.location.pathname + window.location.search !== newUrl) {
    if (replace) {
      history.replaceState({}, '', newUrl)
    } else {
      history.pushState({}, '', newUrl)
    }
  }

  renderRoute()
}

// Navigate to a different application
export function routerNavigateToApp (appName, path = '/default', replace = false) {
  const fullPath = `/${appName}${path}`
  const url = new URL(fullPath, window.location.origin)
  const newUrl = url.pathname + url.search

  if (replace) {
    history.replaceState({}, '', newUrl)
  } else {
    history.pushState({}, '', newUrl)
  }

  // Force full reload when changing apps to clear view cache
  location.reload()
}

export function routerStart () {
  // Replace state to avoid duplicate history entry on first load
  history.replaceState({}, '', window.location.pathname + window.location.search)

  // Intercept browser navigation
  window.addEventListener('popstate', () => renderRoute())

  // Intercept in-app links
  document.body.addEventListener('click', (e) => {
    // Check for router-link attribute
    const linkAttribute = e.target.closest('a[router-link]')
    if (linkAttribute) {
      e.preventDefault()
      let href = linkAttribute.getAttribute('href')

      // If href starts with '/', we strip the leading '/' to make it relative to the app base path
      if (href.startsWith('/')) {
        href = href.substring(1)
      }

      routerNavigate(href)
      // // Check if link is within current app or to different app
      // if (href.startsWith('/') && !href.startsWith('//')) {
      //   routerNavigate(href)
      // } else {
      //   window.location.href = href
      // }
      // return
    }

    // Check for router-link class
    const linkClass = e.target.closest('.router-link')
    if (linkClass) {
      e.preventDefault()

      const href = linkClass.getAttribute('href')

      routerNavigate(href)
    }
  })

  // Initial render
  renderRoute()
}

export function routerGetCurrentApp () {
  return getCurrentAppName()
}

export function routerGoToLoginPage (to) {
  // const appName = getCurrentAppName()
  window.location = '/login.html' + (to ? '?to=' + encodeURIComponent(to) : '')
}

export function routerGoToIndexPage () {
  const appName = getCurrentAppName()
  window.location = `/${appName}`
}

export function routerGoToPage (page) {
  window.location = page
}

// http://localhost:4444/main/execution/execution/work_order/details?workOrderId=1ee9a566-bbf5-4f09-9ba6-f76912bf3b5a
