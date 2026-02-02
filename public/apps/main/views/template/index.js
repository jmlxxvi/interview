// import config from "../../../assets/js/config.js";
import { log } from '../../js/log.js'
import { $ } from '../../js/dom.js'

const logContext = 'VIEW:TEMPLATE'

// View internal state
const templateState = {}

// DOM references
const example = $('#template_example')

// This function resets the view, and is called when the view is loaded or the state should be reset
function resetView () {
  log.info('resetView')
  example.text('Initialized example template view')
  templateState.id = null
}

export async function show (params) {
  resetView()

  log.info('View show', logContext, params)

  templateState.id = params.id
}

export async function hide () {
  log.info('View hide', logContext)
}
