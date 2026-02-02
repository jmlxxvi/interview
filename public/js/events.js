export function eventsListen (event, callback, options) {
  console.log(`Listening for event "${event}"`)

  window.addEventListener(event, (data) => { callback(data.detail) }, options)
}

export function eventsDispatch (event, detail = {}) {
  console.log(`Dispatching event "${event}"`)

  window.dispatchEvent(
    new CustomEvent(event, { bubbles: true, detail })
  )
}
