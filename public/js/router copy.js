import { $, $$ } from './dom.js'

const loadedViews = {}
let currentViewId = null

let routerBaseViewsPath = ''

function pathToSnakeCase (path) {
  // Example usage:
  //   console.log(pathToSnakeCase('/users/view')); // Output: "user_view"
  //   console.log(pathToSnakeCase('/products/list')); // Output: "product_list"

  // Remove leading and trailing slashes
  const cleaned = path.replace(/^\/|\/$/g, '')

  // Split into segments
  const segments = cleaned.split('/')

  // Join with underscores
  return segments.join('_')
}

function searchParamsToObject (searchParams) {
  // Usage:
  //   const paramsObj = searchParamsToObject(new URLSearchParams(window.location.search));

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

// function objectToQueryString (obj) {
//   // Usage:
//   //   const queryString = objectToQueryString({ page: 1, search: "hello" });
//   // Result: "page=1&search=hello"

//   const params = new URLSearchParams()

//   Object.entries(obj).forEach(([key, value]) => {
//     if (value != null && value !== undefined) {
//       if (Array.isArray(value)) {
//         value.forEach(v => params.append(key, v))
//       } else {
//         params.append(key, value)
//       }
//     }
//   })

//   return params.toString()
// }

export function routerShowViewSpinner (skipView = false) {
  if (!skipView) {
    $(`#${currentViewId}`).style.display = 'none'
  }
  $('#loading-screen').style.display = 'flex'
}

export function routerHideViewSpinner (skipView = false) {
  $('#loading-screen').style.display = 'none'
  if (!skipView) {
    $(`#${currentViewId}`).style.display = 'block'
  }
}

async function renderRoute () {
  const url = new URL(window.location.href)
  console.log('renderRoute ----- url: ', url)

  const params = searchParamsToObject(url.searchParams)

  let viewPAth = window.location.pathname.replace(routerBaseViewsPath, '')
  if (viewPAth === '' || viewPAth === '/') {
    viewPAth = '/dashboard'
  }

  const viewId = 'view_' + pathToSnakeCase(viewPAth)
  currentViewId = viewId

  const baseUrl = url.origin

  const assetUrl = `${baseUrl}${routerBaseViewsPath}/views${viewPAth}`

  const views = $$('.view')

  views.forEach((view) => { view.style.display = 'none' })

  if (loadedViews[viewId]) {
    console.log(`View "${viewId}" is already loaded`)

    routerHideViewSpinner(true)
    $('#' + viewId).style.display = 'block'

    loadedViews[viewId]?.show && await loadedViews[viewId].show(params)
  } else {
    console.log(`View "${viewId}" is not loaded yet`)

    routerShowViewSpinner(true)

    // CSS
    const cssFile = `${assetUrl}/styles.css`

    console.log(`Loading view CSS file "${cssFile}"`)

    const head = document.getElementsByTagName('head')[0]
    const style = document.createElement('link')
    style.href = cssFile
    style.type = 'text/css'
    style.rel = 'stylesheet'
    head.append(style)

    // HTML
    const htmlFile = `${assetUrl}/index.html`

    console.log(`Loading view HTML file "${htmlFile}"`)

    try {
      const response = await fetch(htmlFile)

      if (!response.ok) {
        routerNavigate('/errors/404', { replace: true })
      } else {
        const html = await response.text()

        $('.app-main').insertAdjacentHTML('beforeend', `<div id="${viewId}" class="view">${html}</div>`)

        // JS
        const jsFile = `${assetUrl}/index.js`

        console.log(`Loading view JS file "${jsFile}"`)

        const moduleApi = await import(jsFile)

        loadedViews[viewId] = {
          loaded: true,
          show: moduleApi.show
        }

        loadedViews[viewId]?.show && loadedViews[viewId].show(params)

        routerHideViewSpinner(true)

        $('#' + viewId).style.display = 'block'
      }
    } catch (error) {
      $('#errors_network_message').innerHTML = error.message + '<br>' + error.stack.replace('\n', '<br>') || ''
      $('#view_errors_network').style.display = 'block'
      routerHideViewSpinner(true)

      console.error('Error loading view:', error)
    }
  }
}

export function routerNavigate (pathWithQuery, { replace = false } = {}) {
  // Create a URL object to normalize the path and query
  const url = new URL(routerBaseViewsPath + pathWithQuery, window.location.origin)
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

export function routerStart (routerBaseViewsPathParam = '') {
  routerBaseViewsPath = routerBaseViewsPathParam

  // Replace state to avoid duplicate history entry on first load
  history.replaceState({}, '', window.location.pathname + window.location.search)

  // Intercept browser navigation
  window.addEventListener('popstate', () => renderRoute())

  // Intercept in-app links
  document.body.addEventListener('click', (e) => {
    // Option 1: using a specific attribute
    const linkAttribute = e.target.closest('a[router-link]')
    if (linkAttribute) {
      e.preventDefault()
      routerNavigate(linkAttribute.getAttribute('href'))
    }

    // Option 2: using a specific class
    const linkClass = e.target.closest('.router-link')
    if (linkClass) {
      e.preventDefault()
      routerNavigate(linkClass.getAttribute('href'))
    }
  })

  renderRoute()
}

export function routerGoToLoginPage (to) {
  window.location = '/login.html' + (to ? '?to=' + encodeURIComponent(to) : '')
}

export function routerGoToIndexPage () {
  window.location = '/index.html'
}

export function routerGoToPage (page) {
  window.location = page
}
