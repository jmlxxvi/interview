// import { $ } from '../../js/dom.js'
import { securitySafeHtml } from '../../js/security.js'
import { createModal } from './Modal.js'

export function AlertBox (message, type, options = {}) {
  const {
    title = '',
    delay = null,
    // footer = '',
    className = ''
  } = options

  const icon = type === 'error' ? '🔴' : type === 'warning' ? '🔵' : '🟢'

  const html = `
        <div class="modal-backdrop"></div>
        <div class="modal-dialog">
        <div class="modal-content ${className}">
            <div class="modal-header">
              <h5 class="modal-title">${icon} ${title || ''}</h5>
              <img src="/images/icons/delete.svg" class="image-button cursor-pointer modal-close-button" />
            </div>
            <div class="modal-body">${securitySafeHtml(message)}</div>
        </div>
        </div>
    `

  const wrapper = document.createElement('div')
  wrapper.className = 'modal'
  wrapper.innerHTML = html

  // <button class="btn-close" data-dismiss="modal" aria-label="Close">×</button>

  document.body.appendChild(wrapper)
  const modal = createModal(wrapper)
  modal.show()

  if (delay) {
    setTimeout(() => {
      modal.hide()
      wrapper.remove()
    }, delay)
  }

  document.addEventListener('click', async event => {
    if (event.target.closest('.modal-close-button')) {
      modal.hide()
      wrapper.remove()
    }
  })

  document.addEventListener('keydown', async event => {
    if (event.key === ' ') {
      event.preventDefault()
      modal.hide()
      wrapper.remove()
    }
  })

  // $('.modal-footer').focus()
  // $('#component_alert_confirm_yes').focus()

  return modal
}

export function ConfirmBox (message, options = {}) {
  const {
    title = 'Confirmar',
    confirmText = 'Aceptar',
    cancelText = 'Cancelar'
  } = options

  const ok = `<button id="component_dialog_confirm_yes" class="button primary">${confirmText}</button>` || '<img src="/images/icons/check2.svg" class="image-button cursor-pointer" id="component_dialog_confirm_yes" />'
  const cancel = `<button id="component_dialog_confirm_no" class="button secondary">${cancelText}</button>` || '<img src="/images/icons/x-lg.svg" class="image-button cursor-pointer" id="component_dialog_confirm_no" />'

  return new Promise((resolve) => {
    const wrapper = document.createElement('div')
    wrapper.className = 'modal'
    wrapper.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${title}</h5>
            
          </div>
          <div class="modal-body">${securitySafeHtml(message)}</div>
          <div class="modal-footer">${cancel}${ok}</div>
        </div>
      </div>
    `
    // <button class="button secondary" data-dismiss="modal">${cancelText}</button>
    //         <button class="button primary confirm-btn">${confirmText}</button>
    // <button class="btn-close" data-dismiss="modal" aria-label="Close">×</button>

    document.body.appendChild(wrapper)
    const modal = createModal(wrapper)
    modal.show()

    document.addEventListener('click', async event => {
      if (event.target.closest('#component_dialog_confirm_no')) {
        modal.hide()
        wrapper.remove()
        resolve(false)
      }

      if (event.target.closest('#component_dialog_confirm_yes')) {
        modal.hide()
        wrapper.remove()
        resolve(true)
      }
    })
  })
}

export function ConfirmBoxYesNo (message, title = 'Confirm') {
  return ConfirmBox(message, {
    title,
    confirmText: 'Yes',
    cancelText: 'No'
  })
}

export function PromptBox (message, options = {}) {
  const {
    title = 'Prompt',
    placeholder = '',
    defaultValue = '',
    confirmText = 'Save',
    cancelText = 'Cancel',
    required = false,
    regex = null,
    validate = null,
    inputType = 'text'
  } = options

  return new Promise((resolve) => {
    const isTextarea = inputType === 'textarea'
    const inputField = isTextarea
      ? `<textarea class="form-control prompt-input" placeholder="${placeholder}">${defaultValue}</textarea>`
      : `<input type="${inputType}" class="form-control prompt-input" placeholder="${placeholder}" value="${defaultValue}">`

    const wrapper = document.createElement('div')
    wrapper.className = 'modal'
    wrapper.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${title}</h5>
            <button class="btn-close" data-dismiss="modal" aria-label="Close">×</button>
          </div>
          <div class="modal-body">
            <p>${securitySafeHtml(message)}</p>
            ${inputField}
            <div class="prompt-error text-danger" style="display:none; font-size: 0.9em;"></div>
          </div>
          <div class="modal-footer">
            <button class="button secondary" data-dismiss="modal">${cancelText}</button>
            <button class="button primary confirm-btn">${confirmText}</button>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(wrapper)
    const modal = createModal(wrapper)
    modal.show()

    const input = wrapper.querySelector('.prompt-input')
    const errorMsg = wrapper.querySelector('.prompt-error')
    const confirmBtn = wrapper.querySelector('.confirm-btn')

    input.focus()

    const showError = (msg) => {
      errorMsg.textContent = msg
      errorMsg.style.display = 'block'
    }

    const submit = () => {
      const value = input.value.trim()

      if (required && value === '') {
        showError('This field is required.')
        input.focus()
        return
      }

      if (regex && !regex.test(value)) {
        showError('Input does not match the required format.')
        input.focus()
        return
      }

      if (typeof validate === 'function') {
        const error = validate(value)
        if (error) {
          showError(error)
          input.focus()
          return
        }
      }

      modal.hide()
      wrapper.remove()
      resolve(value)
    }

    confirmBtn.addEventListener('click', submit)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !isTextarea) {
        e.preventDefault()
        submit()
      }
    })

    wrapper.querySelectorAll('[data-dismiss="modal"]').forEach(btn =>
      btn.addEventListener('click', () => {
        modal.hide()
        wrapper.remove()
        resolve(null)
      })
    )
  })
}
