/**
 * Returns the element selected
 * @param {string} selector The target for the event
 * @returns any
 */
export function $ (selector) {
  /** @type {HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement}} */
  const $el = document.querySelector(selector)
  if ($el) {
    return $el
  } else {
    console.error(`Element not found for selector "${selector}"`)
  }
}

/**
 * Returns an array of elements selected by the given CSS selector
 * @param {string} selector The CSS selector to select elements with
 * @returns {Array<Element>}
 */
export function $$ (selector) {
  return Array.from(document.querySelectorAll(selector))
}

export function ifClickOutside (targets, callback) {
  document.addEventListener('click', (event) => {
    const ts = targets.replace(/\s/g, '').split(',')

    const boundaries = ts.map((t) => {
      return event.composedPath().includes($(t))
    })

    if (boundaries.every(x => x === false)) {
      callback(boundaries)
    }
  })
}
