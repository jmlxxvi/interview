class SearchInput extends HTMLElement {
  static get observedAttributes () {
    return ['placeholder', 'name', 'autocomplete', 'value', 'width']
  }

  constructor () {
    super()
    this.rendered = false
  }

  connectedCallback () {
    if (!this.rendered) {
      this.render()
      this.rendered = true
    }
  }

  render () {
    const placeholder = this.getAttribute('placeholder') || 'Search…'
    const name = this.getAttribute('name') || 'q'
    const autocomplete = this.getAttribute('autocomplete') || 'off'
    const value = this.getAttribute('value') || ''
    const width = this.getAttribute('width') || '100%'

    this.innerHTML = `
      <style>
        .search-field {
          position: relative;
          display: inline-block;
          width: ${width};
          max-width: 100%;
          color: #6b7280;
        }
        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1.1rem;
          height: 1.1rem;
          pointer-events: none;
        }
        input {
          width: 100%;
          padding: 0.6rem 2.2rem 0.6rem 2.2rem;
          border: 1px solid #d1d5db;
          border-radius: 0rem;
          font-size: 1rem;
          color: var(--gray-900);
          background: #fff;
          outline: none;
          transition: box-shadow 120ms, border-color 120ms;
        }
        input::placeholder { color: #9ca3af; }
        input:focus {
          border-color: var(--gray-900);
          caret-color: var(--gray-900);
        }
        .search-field:focus-within { color: #374151; }

        .clear-icon {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1rem;
          height: 1rem;
          cursor: pointer;
          color: #9ca3af;
          display: none; /* hidden by default */
        }

        input:not(:placeholder-shown) ~ .clear-icon {
          display: block;
        }
      </style>

      <label class="search-field" aria-label="Search">
        <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/>
          <line x1="16.65" y1="16.65" x2="21" y2="21" 
                stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <input type="text" 
          placeholder="${placeholder}" 
          name="${name}" 
          autocomplete="${autocomplete}"
          value="${value}" />
          <svg class="clear-icon" viewBox="0 0 24 24" aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <line x1="6" y1="18" x2="18" y2="6"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
      </label>
    `

    this.input = this.querySelector('input')

    // Relay typing -> input + custom change
    this.input.addEventListener('input', (e) => {
      this._emitInputEvents(e.target.value)
    })

    // Relay blur -> native change
    this.input.addEventListener('change', () => {
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    })

    // Handle clearing via "X" (fires 'search' event)
    this.input.addEventListener('search', (e) => {
      this._emitInputEvents(e.target.value)
    })

    // ✅ hook up logic AFTER setting innerHTML
    const clearBtn = this.querySelector('.clear-icon');

    clearBtn.addEventListener('click', () => {
      this.input.value = '';
      this.input.dispatchEvent(new Event('input', { bubbles: true }));
      this.input.focus();
    });
  }

  _emitInputEvents (value) {
    // Standard input event
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    // Custom change with detail
    this.dispatchEvent(new CustomEvent('change', {
      detail: value,
      bubbles: true,
      composed: true
    }))
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (oldValue === newValue || !this.rendered) return

    if (name === 'width') {
      this.querySelector('.search-field').style.width = newValue
    } else if (name === 'value') {
      this.input.value = newValue || ''
    } else {
      this.input.setAttribute(name, newValue || '')
    }
  }

  get value () {
    return this.input?.value || ''
  }

  set value (val) {
    if (this.input) this.input.value = val
  }
}
customElements.define('forms-search', SearchInput)
