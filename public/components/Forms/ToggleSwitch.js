class ToggleSwitch extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          outline: none;
        }

        * {
          cursor: pointer;
        }

        :host(:focus-visible) {
          outline: 2px solid var(--gray-700);
          outline-offset: 4px;
          border-radius: 4px;
        }

        /* Put label on the left if requested */
        :host([label-position="left"]) {
          flex-direction: row-reverse;
        }

        .toggle {
          position: relative;
          display: inline-block;
          width: 36px;   /* smaller width */
          height: 20px;  /* smaller height */
        }

        input {
          opacity: 0;
          width: 0;
          height: 0;
          position: absolute;
        }

        .slider {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #ccc;
          border-radius: 999px;
          transition: background-color 0.3s;
        }

        .slider::before {
          content: "";
          position: absolute;
          height: 16px; /* smaller knob */
          width: 16px;
          left: 2px;
          top: 50%;
          transform: translateY(-50%);
          background-color: white;
          border-radius: 50%;
          transition: transform 0.3s;
        }

        input:checked + .slider {
          background-color: var(--gray-900);
        }

        input:checked + .slider::before {
          transform: translateY(-50%) translateX(16px); /* adjusted for smaller width */
        }

        .label-text {
          user-select: none;
        }

        :host([disabled]) {
          opacity: 0.6;
          pointer-events: none;
        }
      </style>

      <label class="toggle">
        <input type="checkbox">
        <span class="slider"></span>
      </label>
      <span class="label-text"><slot></slot></span>
    `

    this.checkbox = this.shadowRoot.querySelector('input')
  }

  connectedCallback () {
    this.setAttribute('tabindex', '0')
    this.setAttribute('role', 'switch')
    this._updateAria()

    if (this.hasAttribute('checked')) {
      this.checkbox.checked = true
    }
    if (this.hasAttribute('disabled')) {
      this.checkbox.disabled = true
    }

    this.checkbox.addEventListener('change', () => {
      this._updateAria()
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    })

    this.shadowRoot.querySelector('.label-text').addEventListener('click', () => {
      if (!this.checkbox.disabled) this.toggle()
    })

    this.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        if (!this.checkbox.disabled) this.toggle()
      }
    })
  }

  _updateAria () {
    this.setAttribute('aria-checked', this.checkbox.checked)
  }

  toggle () {
    this.checkbox.checked = !this.checkbox.checked
    this._updateAria()
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  get checked () {
    return this.checkbox.checked
  }

  set checked (value) {
    this.checkbox.checked = Boolean(value)
    this._updateAria()
  }
}

customElements.define('toggle-switch', ToggleSwitch)
