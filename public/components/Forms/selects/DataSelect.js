import { $, ifClickOutside } from '../../../js/dom.js'
import { securitySafeHtml } from '../../../js/security.js'
// import { eventsListen } from '../../../js/events.js'
import { suid, debounce } from '../../../js/utils.js'
import { log } from '../../../js/log.js'
import { backendRpc } from '../../../js/backend.js'

const logContext = 'DATASELECT'

export function DataSelect ({
  id,
  target,
  data = [],
  options = {},
  classes = ''
}) {
  // 1 - Get a reference to the node
  const $target = $(target)

  // 2 - Create an ID for the component if not set from the parameters
  id = id || suid()
  let $ref

  /** @type {Object} */
  let selectedOptions = {}

  // let loaded = false

  options = {
    load: true,
    placeholder: 'Seleccione una opción',
    loading: 'Cargando...',
    select_first: false,
    selected: [],
    searchOnBackend: false,
    multiselect: false,
    show_selected_elements: true,
    min_selected_elements: 0,
    max_selected_elements: Infinity,
    ...options
  }

  // We may send the selected element as an scalar value instead of an array if there is only one value selected
  function scalarToArray (selected) {
    return (Array.isArray(selected)) ? selected : [selected]
  }

  options.selected = scalarToArray(options.selected)

  async function loadData () {
    if (options.load && options.rpc) {
      const args = typeof options.rpc.args === 'function' ? options.rpc.args() : options.rpc.args

      const response = await backendRpc(options.rpc.mod, options.rpc.fun, args)

      if (response.status.error) {
        log(response.status.message, logContext, true)
      } else {
        data = response.data

        // loaded = true
      }
    }
  }

  async function buildOptions (filter) {
    let selectHtml = ''

    let index = 0

    for (const op of data) {
      if (!filter || op.value.toUpperCase().includes(filter.toUpperCase())) {
        index++

        let checkedClass = ''

        if (options.selected.includes(op.key) || (options.select_first && index === 1)) {
          selectedOptions[op.key] = op.value
          checkedClass = options.multiselect ? 'checked' : ''
        } else {
          checkedClass = selectedOptions[op.key] && options.multiselect ? 'checked' : ''
        }

        selectHtml += `<li class="component-dataselect-item ${checkedClass}" data-value="${op.key}" tabindex="0">
                                    <span class="checkbox">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check" viewBox="0 0 16 16">
                                            <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
                                        </svg>
                                    </span>
                                    <span class="item-text">${op.value}</span>
                                </li>`
      }
    }

    // We check for selected elements only the first load
    options.selected = []

    $(`#${id}-list`).innerHTML = securitySafeHtml(selectHtml)

    showSelectedOptions()
  }

  function buildSelect () {
    const selectHtml = `
            <div id="${id}-container" tabindex="0" class="component-dataselect-container focus-ring focus-ring-primary ${classes}" aria-label="Dynamic Select">
                <div id="${id}" class="component-dataselect-select-btn">${options.load ? options.loading : options.placeholder}</div>
                <div class="component-dataselect-list">
                    <div class="flex flex-justify-between w-100 px-4 pt-3">
                        <div id="${id}-search" class="component-dataselect-search">
                            <svg class="component-dataselect-search-lens" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-search" viewBox="0 0 16 16">
                                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
                            </svg>
                            <input spellcheck="false" type="text" placeholder="Search" />
                            <svg id="${id}-search-clear" class="component-dataselect-search-clear" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
                                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
                            </svg>
                        </div>
                        <div><a href="#" id="${id}-refresh">Refrescar</a></div>
                        <div><a href="#" id="${id}-selection-clear">Limpiar</a></div>
                    </div>

                    <div class="component-dataselect-data" tabindex="-1">
                        <ul id="${id}-list" tabindex="-1"></ul>
                    </div>
                </div>
            </div>`

    // $(target).innerHTML = securitySafeHtml(selectHtml);
    $(target).innerHTML = selectHtml

    $ref = $(`#${id}`)
  }

  function showSelectedOptions () {
    const selectedOptionsLength = Object.keys(selectedOptions).length

    if (selectedOptionsLength > 0) {
      if (options.show_selected_elements) {
        if (options.multiselect) {
          let html = ''

          for (const [key, value] of Object.entries(selectedOptions)) {
            html += `<div class="component-dataselect-selected-item" data-key="${key}">${value}</div>`
          }

          $ref.innerHTML = securitySafeHtml(html)
        } else {
          $ref.innerHTML = securitySafeHtml(Object.values(selectedOptions)[0])
        }
      } else {
        $ref.innerHTML = securitySafeHtml(`${selectedOptionsLength} selected`)
      }
    } else {
      $ref.innerText = options.placeholder
    }
  }

  function checkOption (item) {
    const key = item.dataset.value
    const value = item.innerText

    if (options.multiselect) {
      if (typeof selectedOptions[key] === 'undefined') {
        selectedOptions[key] = value
      } else {
        delete selectedOptions[key]
      }

      item.classList.toggle('checked')
    } else {
      selectedOptions = { [key]: value }

      $(`#${id}`).classList.remove('open')
    }

    showSelectedOptions()

    if (typeof options.onselect === 'function') {
      options.onselect(key, value, selectedOptions)
    }
  }

  function clearSearchBox () {
    $(`#${id}-search input`).value = ''
  }

  if ($target) {
    buildSelect()

    loadData().then(() => {
      buildOptions().then(() => {
        if (typeof options.oninit === 'function') {
          options.oninit(id, selectedOptions, $ref)
        }

        document.body.addEventListener('click', (event) => {
          const target = /** @type {any} */(event.target)

          if (target.matches(`#${id}-list .component-dataselect-item`)) {
            checkOption(target)
          }

          if (target.matches(`#${id}-list .component-dataselect-item span`)) {
            checkOption(target.parentNode)
          }

          if (target.matches(`#${id} .component-dataselect-selected-item`)) {
            const key = target.dataset.key

            delete selectedOptions[key]

            buildOptions()

            showSelectedOptions()
          } else if (target.matches(`#${id}`)) {
            $ref.classList.toggle('open')
          }
        })

        $(`#${id}-search-clear`).addEventListener('click', () => {
          clearSearchBox()

          buildOptions()
        })

        $(`#${id}-selection-clear`).addEventListener('click', (event) => {
          event.preventDefault()

          reset()
        })

        $(`#${id}-refresh`).addEventListener('click', (event) => {
          event.preventDefault()

          reload()
        })

        $(`#${id}-search input`).addEventListener('keyup', debounce((event) => {
          // const target = /** @type {any} */(event.target)

          const searchText = event.target.value.trim()

          if (options.searchOnBackend) {
            options.rpc.args = { search: searchText }
            options.load = true
            loadData().then(() => buildOptions(searchText))
          } else {
            buildOptions(searchText)
          }
        }, 400)) // 400ms delay is typical

        $(`#${id}-container`).addEventListener('keyup', (/** @type {KeyboardEvent} */event) => {
          const key = event.keyCode

          if (key === 27) { // Escape
            $ref.classList.remove('open')
          }

          if (key === 13) { // Enter
            $ref.classList.toggle('open')
          }
        })

        $(`#${id}-list`).addEventListener('keyup', (/** @type {KeyboardEvent} */event) => {
          const key = event.keyCode

          const target = /** @type {any} */(event.target)

          if (key === 38) { // Up
            const previousElement = target.previousSibling
            if (previousElement) {
              previousElement.focus()
            } else {
              target.parentElement?.lastElementChild?.focus()
            }
          }

          if (key === 40) { // Down
            const nextElement = target.nextSibling
            if (nextElement) {
              nextElement.focus()
            } else {
              target.parentElement?.firstElementChild?.focus()
            }
          }

          if (key === 32) { // Space
            // event.preventDefault();
            event.stopPropagation()
            // event.stopImmediatePropagation();
            checkOption(event.target)
          }
        })

        $(`#${id}-list`).addEventListener('keydown', (/** @type {KeyboardEvent} */event) => {
          const key = event.keyCode

          if (key === 32) { // Space
            event.preventDefault()
          }
        })

        ifClickOutside(`#${id}-container`, () => {
          $ref.classList.remove('open')
        })
      })
    })
  } else {
    log(`Target not found for selector "${target}"`, logContext, true)
  }

  function getCount () {
    return Object.keys(selectedOptions).length
  }

  function reset () {
    options.selected = []
    selectedOptions = {}
    buildOptions()
  };

  function reload (onReload) {
    options.load = true
    clearSearchBox()
    loadData().then(() => {
      buildOptions()
    })
  };

  return {
    id,
    reload,
    reset,
    setArgs (args) {
      options.load = true
      selectedOptions = {}
      options.rpc.args = args
      clearSearchBox()
    },
    setSelected (values, reset = true) {
      if (options.multiselect) {
        if (reset) {
          options.selected = [...scalarToArray(values)]
        } else {
          options.selected = [...Object.keys(selectedOptions), ...scalarToArray(values)]
        }
      } else {
        options.selected = scalarToArray(values)
      }

      selectedOptions = {}
    },
    getSelectedData () {
      return selectedOptions
    },
    getSelectedKeys () {
      const keys = Object.keys(selectedOptions)
      return options.multiselect ? keys : keys[0]
    },
    getSelectedValues () {
      const values = Object.values(selectedOptions)
      return options.multiselect ? values : values[0]
    },
    getCount

  }
}
