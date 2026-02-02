import DOMPurify from '../vendor/dompurify/purify.es.mjs'
import { backendRpc } from './backend.js'
import { routerGoToLoginPage } from './router.js'

export const securitySafeHtml = (html) => {
  // https://github.com/cure53/DOMPurify/issues/947#issuecomment-2100632149
  html = html === 0 ? '0' : html

  // Start with this minimal configuration
  const config = {
    ADD_TAGS: ['app-badge', 'app-dropdown', 'app-item-code'],
    ADD_ATTR: ['menu-width', 'code', 'color', 'slot', 'position']
  }

  return DOMPurify.sanitize(html, config)
}

export function securityLogoff (to) {
  backendRpc('app/auth/public', 'logoff')

  const currentPath = to || (window.location.pathname + window.location.search)

  routerGoToLoginPage(currentPath)
}
