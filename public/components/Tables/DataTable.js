// import { eventsListen } from "../../js/events.js";
// import { i18nGetLabel } from "../../assets/js/i18n.js";
import { $ } from '../../js/dom.js'
import { backendRpc } from '../../js/backend.js'
import { log } from '../../js/log.js'
import { securitySafeHtml } from '../../js/security.js'
// import { toastShow } from "../Notifications/Toast.js";
import { camelToSnake, suid } from '../../js/utils.js'
// import { alertboxShow } from "../Notifications/Alertbox.js";

import { AlertBox } from '../Modal/Dialogs.js'

const logContext = 'DATATABLE'

export function booleanIcon (value) {
  let icon = ''
  if (value === true || value === 'true') {
    icon += `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check" viewBox="0 0 16 16">
                    <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
                </svg>`
  } else {
    icon += `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-dash" viewBox="0 0 16 16">
                    <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8"/>
                </svg>`
  }

  return icon
}

/** @typedef {object} json
 * @property {boolean} load
 * @property {object} action
 * @property {string} action.label
 * @property {null} action.callback
 * @property {boolean} footer
 * @property {number} rowsPerPage
 */

/**
 * Creates a DataTable component with customizable options and columns.
 *
 * @param {Object} config - Configuration object for the DataTable.
 * @param {string} config.target - The DOM selector for the table container.
 * @param {Object} config.params - Array containing module and function names for RPC.
 * @param {Object} [config.options] - Additional options for the DataTable.
 * @param {string} [config.options.id] - The unique identifier for the DataTable.
 * @param {boolean} [config.options.load] - Load the data from the server.
 * @param {Object} [config.options.action] - Action button configuration.
 * @param {string} [config.options.action.label] - Label for the action button.
 * @param {function} [config.options.action.callback] - Callback to execute on action button click.
 * @param {boolean} [config.options.footer] - Flag to enable or disable table footer.
 * @param {number} [config.options.rowsPerPage=5] - Number of rows displayed per page.
 * @param {Object} [config.columns] - Configuration object for table columns.
 * @param {string} [config.classes] - Additional CSS classes to apply to the table.
 *
 * @returns {Object} - An object containing the table ID and methods to reload the table or set new arguments.
 */
export function DataTable ({
  target,
  params,
  options = {},
  columns = {},
  classes = ''
}) {
  const id = options.id || suid()

  const mod = params[0]
  const fun = params[1]

  let $ref

  options = {
    load: true,
    search: true,
    footer: true,
    rowsPerPage: 5,
    headerExtraHtml: '',
    showMissingColumns: false,
    ...options
  }

  const xargs = typeof params[2] === 'function' ? params[2]() : params[2] || {}

  let args = {
    search: '%',
    orderCol: options.orderCol || 1,
    orderDir: options.orderDir || 'asc',
    page: 1,
    size: options.rowsPerPage,
    ...xargs
  }

  function columnVisible (column) {
    return typeof columns[column]?.visible === 'undefined' || columns[column]?.visible
  }

  function columnSortable (column) {
    return columns[column]?.sortable || typeof columns[column]?.sortable === 'undefined' || typeof columns[column]?.sortBy !== 'undefined'
  }

  function columnSortBy (column) {
    return columns[column]?.sortBy
  }

  function buildHeader (header, order, headerAligned, column) {
    let orderIconHtml = ''

    if ((args.orderCol === parseInt(order)) || (args.orderCol === order)) {
      orderIconHtml = args.orderDir === 'asc'
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-sort-alpha-down" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M10.082 5.629 9.664 7H8.598l1.789-5.332h1.234L13.402 7h-1.12l-.419-1.371zm1.57-.785L11 2.687h-.047l-.652 2.157z"/>
                        <path d="M12.96 14H9.028v-.691l2.579-3.72v-.054H9.098v-.867h3.785v.691l-2.567 3.72v.054h2.645zM4.5 2.5a.5.5 0 0 0-1 0v9.793l-1.146-1.147a.5.5 0 0 0-.708.708l2 1.999.007.007a.497.497 0 0 0 .7-.006l2-2a.5.5 0 0 0-.707-.708L4.5 12.293z"/>
                    </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-sort-alpha-down-alt" viewBox="0 0 16 16">
                        <path d="M12.96 7H9.028v-.691l2.579-3.72v-.054H9.098v-.867h3.785v.691l-2.567 3.72v.054h2.645z"/>
                        <path fill-rule="evenodd" d="M10.082 12.629 9.664 14H8.598l1.789-5.332h1.234L13.402 14h-1.12l-.419-1.371zm1.57-.785L11 9.688h-.047l-.652 2.156z"/>
                        <path d="M4.5 2.5a.5.5 0 0 0-1 0v9.793l-1.146-1.147a.5.5 0 0 0-.708.708l2 1.999.007.007a.497.497 0 0 0 .7-.006l2-2a.5.5 0 0 0-.707-.708L4.5 12.293z"/>
                    </svg>`
    }

    const isSortable = columnSortable(column)

    const cursor = isSortable ? 'pointer' : 'default'
    const orderIcon = isSortable ? `<div data-order="${order}">${orderIconHtml}</div>` : ''

    return `
            <div class="${id}_data_order hstack" style="cursor: ${cursor}; ${headerAligned}" data-order="${order}" data-column="${column}">
                <div>${header}</div>
                ${orderIcon}
            </div>`
  }

  function replaceColumnValue (value, row) {
    if (value) {
      return value.replace(/\[(.+?)\]/g, (_string, value) => {
        return row[value] || value
      })
    } else {
      return ''
    }
  }

  function headerAlign (column) {
    let cellAlign = 'justify-content: end;'

    if (columns[column] && columns[column].align === 'left') {
      cellAlign = 'justify-content: start;'
    }

    if (columns[column] && columns[column].align === 'center') {
      cellAlign = 'justify-content: center;'
    }

    if (columns[column] && columns[column].align === 'right') {
      cellAlign = 'justify-content: end;'
    }

    return cellAlign
  }

  function columAlign (column) {
    let cellAlign = 'text-align: end;'

    if (columns[column] && columns[column].align === 'left') {
      cellAlign = 'text-align: start;'
    }

    if (columns[column] && columns[column].align === 'center') {
      cellAlign = 'text-align: center;'
    }

    if (columns[column] && columns[column].align === 'right') {
      cellAlign = 'text-align: end;'
    }

    return cellAlign
  }

  function sortObjectByTemplate (targetObj) {
    const templateKeys = Object.keys(columns)
    const targetKeys = Object.keys(targetObj)

    // Separate keys into two groups: those in template and those not in template
    const keysInTemplate = templateKeys.filter(key => targetKeys.includes(key))
    const keysNotInTemplate = targetKeys.filter(key => !templateKeys.includes(key))

    // Create new object with keys in the desired order
    const sortedObj = {}

    // Add keys from template order first
    keysInTemplate.forEach(key => {
      sortedObj[key] = targetObj[key]
    })

    // Add remaining keys
    keysNotInTemplate.forEach(key => {
      sortedObj[key] = targetObj[key]
    })

    return sortedObj
  }

  async function buildRows () {
    const response = await backendRpc(mod, fun, args)

    if (response.status.error) {
      log(response.status.message, logContext, true)
      AlertBox(response.status.message, 'error')
      $ref.innerHTML = ''
    } else {
      const { rows, count } = response.data

      if (rows.length > 0) {
        let tableHtml = ''

        tableHtml += '<thead><tr>'

        const firstRow = rows[0]

        const orderedRow = sortObjectByTemplate(firstRow)

        for (const header of Object.keys(orderedRow)) {
          if (columnVisible(header) && (options.showMissingColumns || typeof columns[header] !== 'undefined')) {
            const headerAligned = headerAlign(header)

            let v = header

            if (columns[header] && typeof columns[header].header === 'string') {
              v = replaceColumnValue(columns[header].header, rows[0])
            }

            const order = header

            tableHtml += `<th>${buildHeader(v, order, headerAligned, header)}</th>`
          }
        }

        tableHtml += '</tr></thead>'

        tableHtml += '<tbody>'

        for (const unorderedRow of rows) {
          const row = sortObjectByTemplate(unorderedRow)

          let columnCount = 0

          for (const [column, value] of Object.entries(row)) {
            if (columnVisible(column) && (options.showMissingColumns || typeof columns[column] !== 'undefined')) {
              const cellAlign = columAlign(column)

              if (columnCount === 0) {
                tableHtml += '<tr>'
              }

              let v = value ?? ''

              if (typeof columns[column]?.transform === 'function') {
                v = replaceColumnValue(columns[column].transform(v, row, id), row)
              } else if (typeof value === 'boolean') {
                v = value
                  ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check" viewBox="0 0 16 16">
                                                <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
                                            </svg>`
                  : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-dot" viewBox="0 0 16 16">
                                                <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>
                                            </svg>`
              } else if (value === 'string') {
                v = replaceColumnValue(columns[column].value, row)
              }

              const dataCell = (columns[column] && typeof columns[column].header === 'string') ? columns[column].header : column

              tableHtml += `<td data-cell="${dataCell}" style="${cellAlign}">${securitySafeHtml(v)}</td>`

              if (columnCount === Object.keys(row).length - 1) {
                tableHtml += '</tr>'
              }

              columnCount++
            }
          }
        }

        tableHtml += '</tbody>'

        $ref.innerHTML = tableHtml

        const from = ((args.page - 1) * args.size) + 1
        const to = Math.min(args.page * args.size, count)

        if (to > 0) {
          $(`#${id}_message`).innerText = `Showing rows ${from.toString()} to ${to.toString()} of ${count.toString()}`
        } else {
          $(`#${id}_message`).innerText = 'No records found'
        }

        if (args.page === 1) {
          $(`#${id}_previous`).classList.add('disabled')
        } else {
          $(`#${id}_previous`).classList.remove('disabled')
        }

        if (args.page >= Math.ceil(count / args.size)) {
          $(`#${id}_next`).classList.add('disabled')
        } else {
          $(`#${id}_next`).classList.remove('disabled')
        }
      } else {
        $ref.innerHTML = ''
        $(`#${id}_message`).innerText = 'No records found'
      }
    }
  }

  function buildTable () {
    const footerHtml = options.footer
      ? `<div class="hstack gap-2 justify-content-between align-items-center">
                                                        <div id="${id}_message"></div>
                                                        <div class="flex-row-between">
                                                            <button id="${id}_previous" type="button" class="button link">Previous</button>
                                                            <button id="${id}_next" type="button" class="button link ml-3">Next</button>
                                                        </div>
                                                    </div>`
      : ''

    const html = `
            <div class="vstack gap-2">
                <div class="component--datatable-table-container">
                    <table id="${id}" class="table table-striped table-hover table-bordered ${classes}"></table>
                </div>
                ${footerHtml}
            </div>`

    // $(target).innerHTML = securitySafeHtml(html);
    $(target).innerHTML = html

    $ref = $(`#${id}`)

    $(`#${id}_previous`).addEventListener('click', () => {
      args.page--

      if (args.page < 1) {
        args.page = 1
      }

      buildRows()
    })

    $(`#${id}_next`).addEventListener('click', () => {
      args.page++

      buildRows()
    })
  }

  // Init
  const $target = $(target)

  document.body.addEventListener('click', (event) => {
    const target = event.target.closest(`.${id}_data_order`)
    if (target && columnSortable(target.dataset.column)) {
      const sortcColumn = columnSortBy(target.dataset.column) || target.dataset.column
      args.page = 1
      args.orderDir = args.orderDir === 'asc' ? 'desc' : 'asc'
      args.orderCol = camelToSnake(sortcColumn)

      buildRows()
    }
  })

  if ($target) {
    buildTable()
    if (options.load) {
      buildRows().then(() => {
        if (typeof options.oninit === 'function') {
          options.oninit(id, $ref)
        }
      })
    }
  } else {
    log(`Target not found for selector "${target}"`, logContext, true)
  }

  return {
    id,
    reload () {
      buildRows()
    },
    setArgs (newArgs) {
      args = {
        ...args,
        ...newArgs
      }
      buildRows()
    },
    search (value) {
      args.search = value || ''
      args.page = 1
      buildRows()
    }

  }
}
