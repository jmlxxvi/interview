import { eventsDispatch } from './events.js'

const state = {}

export function stateGet (key) {
  return deepCopy(state[key])
}

export function stateSet (key, value) {
  state[key] = value

  const stateCopy = deepCopy(state)

  eventsDispatch('state-change', { key, state: stateCopy })

  return stateCopy[key]
}

export function stateRemove (key) {
  delete state[key]

  const stateCopy = deepCopy(state)

  eventsDispatch('state-change', { key, state: stateCopy })

  return null
}

function deepCopy (obj) {
  if (window.structuredClone) {
    return window.structuredClone(obj) || null
  } else {
    return JSON.parse(JSON.stringify(obj === undefined ? null : obj))
  }
}
