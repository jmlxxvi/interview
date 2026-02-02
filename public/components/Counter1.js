import { $ } from '../js/dom.js'
import { securitySafeHtml } from '../js/security.js'
import { suid } from '../js/utils.js'

export function Counter1 ({
  id,
  target,
  state
}) {
  // 0 - Create a container (most likely a <div>) on HTML to inject this component into it
  // The target paramter of this components function is the ID of that container

  // 1 - Create an ID for the component if not set from the parameters
  id = id || suid()

  // 2 - Get a reference to the node holoding the component
  const $target = $(target)

  // 3 - Create the state object (including defaults)
  const defaults = { value: 0 }

  state = state ? { ...defaults, ...state } : defaults

  // 4 - Set the initial state (in case of reset)
  const initialState = { ...state }

  // Initial build of the component
  // This is the UI of the component with the IDs to interact with it
  function build () {
    $target.innerHTML = securitySafeHtml(`
            <div id="${id}" class="counter1">
                <button id="${id}_down" aria-label="Decrement">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-dash" viewBox="0 0 16 16">
                        <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8"/>
                    </svg>
                </button>
                <div id="${id}_value">${state.value}</div>
                <button id="${id}_up" aria-label="Increment">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-plus-lg" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2"/>
                    </svg>
                </button>
            </div>`)
  }

  // Internal API for DOM (and state) manipulation
  // Here the state and the UI are synchronized
  function setValue (value) {
    state.value = value
    $('#' + id + '_value').innerHTML = securitySafeHtml(String(value))
  }

  // 5 - Check if target exists
  if ($target) {
    // 6 - Build the component
    build()

    // 7 - Set styles (or use a CSS file)
    $('#' + id + '_value').style.margin = '0 1rem'

    // 8 - Attach listeners to the component UI IDs
    $(`#${id}_up`).addEventListener('click', () => {
      // 9 - Call the functions that modify the state and the DOM
      setValue(++state.value)
    })

    $(`#${id}_down`).addEventListener('click', () => {
      setValue(--state.value)
    })
  } else {
    console.error(`Target not found for selector "${target}"`)
  }

  // 10 - Return a closure with the component's public API
  return {
    id,
    getValue () {
      return state.value
    },
    setValue,
    reset () {
      setValue(initialState.value)
    }
  }
}
