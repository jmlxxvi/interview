// modal.js
export function createModal (target, options = {}) {
  const modal = typeof target === 'string' ? document.querySelector(target) : target
  if (!modal) throw new Error('Modal element not found.')

  const backdrop = modal.querySelector('.modal-backdrop')
  const closeButtons = modal.querySelectorAll('[data-dismiss="modal"], .btn-close')
  const titleElem = modal.querySelector('.modal-title')
  const bodyElem = modal.querySelector('.modal-body')
  const footerElem = modal.querySelector('.modal-footer')

  let focusableElements = []
  let firstFocusable = null
  let lastFocusable = null

  const setFocusable = () => {
    focusableElements = modal.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input[type="text"], input[type="radio"], ' +
            'input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    )
    firstFocusable = focusableElements[0]
    lastFocusable = focusableElements[focusableElements.length - 1]
  }

  const trapFocus = (e) => {
    if (e.key !== 'Tab') return
    if (focusableElements.length === 0) return

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault()
        lastFocusable.focus()
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault()
        firstFocusable.focus()
      }
    }
  }

  const onEscape = (e) => {
    if (e.key === 'Escape') hide()
  }

  const show = () => {
    modal.classList.add('show')
    document.body.style.overflow = 'hidden'

    setFocusable()
    document.addEventListener('keydown', onEscape)
    document.addEventListener('keydown', trapFocus)

    if (firstFocusable) {
      firstFocusable.focus()
    }
  }

  const hide = () => {
    modal.classList.remove('show')
    document.body.style.overflow = ''

    document.removeEventListener('keydown', onEscape)
    document.removeEventListener('keydown', trapFocus)
  }

  const setTitle = (html) => {
    if (titleElem) titleElem.innerHTML = html
  }

  const setBody = (html) => {
    if (bodyElem) bodyElem.innerHTML = html
  }

  const setFooter = (html) => {
    if (footerElem) {
      footerElem.innerHTML = html
      footerElem.querySelectorAll('[data-dismiss="modal"]').forEach(btn =>
        btn.addEventListener('click', hide)
      )
    }
  }

  // Initial close buttons
  backdrop?.addEventListener('click', hide)
  closeButtons.forEach(btn => btn.addEventListener('click', hide))

  // Optional content
  if (options.title) setTitle(options.title)
  if (options.body) setBody(options.body)
  if (options.footer) setFooter(options.footer)

  return {
    show,
    hide,
    setTitle,
    setBody,
    setFooter
  }
}

/*

// main.js
import { createModal } from './modal.js';

document.addEventListener('DOMContentLoaded', () => {
  const modal = createModal('#myModal', {
    title: 'Welcome!',
    body: '<p>This modal was initialized with content.</p>',
    footer: `
      <button class="btn" data-dismiss="modal">Cancel</button>
      <button class="btn btn-primary" id="proceedBtn">Proceed</button>
    `
  });

  document.getElementById('openModalBtn').addEventListener('click', () => {
    modal.show();

    setTimeout(() => {
      const btn = document.getElementById('proceedBtn');
      if (btn) btn.addEventListener('click', () => {
        alert('You clicked proceed!');
        modal.hide();
      });
    }, 0);
  });
});

*/
