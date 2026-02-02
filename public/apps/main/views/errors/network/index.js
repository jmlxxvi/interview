import { $ } from '../../../../../js/dom.js'
export async function show (params) {
  // No special handling needed for 404 view
  $('#errors_network_message').textContent = params.error || 'Unknown error'
}

export async function hide () {
  // No special handling needed for 404 view
}
