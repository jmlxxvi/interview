import { routerNavigate } from '../../../js/router.js'

class DocumentCard extends HTMLElement {
  static get observedAttributes () {
    return ['label', 'value', 'subtext', 'dest']
  }

  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.handleClick = this.handleClick.bind(this)
  }

  // --- Properties for JS access ---
  get label () { return this.getAttribute('label') }
  set label (value) { this.setAttribute('label', value) }

  get value () { return this.getAttribute('value') }
  set value (val) { this.setAttribute('value', val) }

  get subtext () { return this.getAttribute('subtext') }
  set subtext (val) { this.setAttribute('subtext', val) }

  get dest () { return this.getAttribute('dest') }
  set dest (val) { this.setAttribute('dest', val) }

  attributeChangedCallback (name, oldValue, newValue) {
    if (oldValue !== newValue) this.render()
  }

  connectedCallback () {
    this.render()
    this.shadowRoot.querySelector('.document-card')?.addEventListener('click', this.handleClick)
  }

  disconnectedCallback () {
    this.shadowRoot.querySelector('.document-card')?.removeEventListener('click', this.handleClick)
  }

  handleClick () {
    const dest = this.dest
    if (dest) routerNavigate(dest)
  }

  render () {
    const label = this.label || ''
    const value = this.value || ''
    const subtext = this.subtext || ''
    const dest = this.dest || ''

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .document-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          background: var(--gray-100);
          border-radius: 0;
          padding: 1rem;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        }

        .document-card:hover {
          border: 1px solid var(--gray-500);
          background-color: var(--gray-100);
        }

        ::slotted(.icon) {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .label {
          font-size: 0.9rem;
          color: var(--gray-600);
          margin-bottom: 0.25rem;
        }

        .value {
          font-size: 1.6rem;
          font-weight: bold;
        }

        .subtext {
          padding-top: 0.25rem;
          font-size: 0.8rem;
          color: var(--gray-500);
          font-style: italic;
        }
      </style>
      <div class="document-card" data-dest="${dest}">
        <slot name="icon"></slot>
        <div class="label">${label}</div>
        <div class="value">${value}</div>
        <div class="subtext">${subtext}</div>
      </div>
    `
  }
}

customElements.define('fman-card', DocumentCard)
/*

<!-- Example usage -->
<fman-card
  label="ARCA"
  value="Certificado de inscripción"
  subtext="Cargado en 2025-01-25 19:30"
  dest="arca-ci"
></fman-card>
*/
