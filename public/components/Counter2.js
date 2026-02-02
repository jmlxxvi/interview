import { securitySafeHtml } from '../js/security.js'

class CounterElement extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })

    this.count = 0

    this.shadowRoot.innerHTML = securitySafeHtml(`
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                :host {
                    display: flex;
                    align-items: center;
                    gap: .25rem;
                }
                .counter2 {
                    display: flex;
                    align-items: center;
                    gap: .5rem;
                }
                button {
                    height: 2rem;
                    width: 2rem;
                    background-color: var(--primary);
                    border: none;
                    color: white;
                    border-radius: var(--border-radius);
                    cursor: pointer;
                }
                button:active {
                    background: #0056b3;
                }
                #count {
                    margin: 0 1rem;
                    text-align: center;
                }
            </style>
            <div class="counter2">
                <button id="decrease" aria-label="Decrement">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-dash" viewBox="0 0 16 16">
                        <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8"/>
                    </svg>
                </button>
                <div id="count">${this.count}</div>
                <button id="increase" aria-label="Increment">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-plus-lg" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2"/>
                    </svg>
                </button>
            </div>
        `)

    this.decreaseBtn = this.shadowRoot.getElementById('decrease')
    this.increaseBtn = this.shadowRoot.getElementById('increase')
    this.countDisplay = this.shadowRoot.getElementById('count')

    this.decreaseBtn.addEventListener('click', () => this.updateCount(-1))
    this.increaseBtn.addEventListener('click', () => this.updateCount(1))
  }

  static get observedAttributes () {
    return ['initial']
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'initial' && !isNaN(newValue)) {
      this.count = parseInt(newValue, 10)
      this.countDisplay.textContent = this.count
    }
  }

  connectedCallback () {
    if (this.hasAttribute('initial')) {
      this.count = parseInt(this.getAttribute('initial'), 10) || 0
      this.countDisplay.textContent = this.count
    }
  }

  updateCount (value) {
    this.count += value
    this.countDisplay.textContent = this.count
    this.dispatchChangeEvent()
  }

  /** Getter to retrieve the counter value */
  get value () {
    return this.count
  }

  /** Setter to manually update the counter */
  set value (newValue) {
    if (!isNaN(newValue)) {
      this.count = parseInt(newValue, 10)
      this.countDisplay.textContent = this.count
      this.dispatchChangeEvent()
    }
  }

  /** Method to reset the counter to its initial value */
  reset () {
    this.value = this.getAttribute('initial') ? parseInt(this.getAttribute('initial'), 10) : 0
  }

  /** Dispatch a custom event when the counter value changes */
  dispatchChangeEvent () {
    const event = new CustomEvent('counter-change', {
      detail: { value: this.count },
      bubbles: true, // To propagate the event to parent elements
      composed: true // To allow the event to cross shadow DOM boundaries
    })
    this.dispatchEvent(event)
  }
}

// Define the custom element
customElements.define('counter-element', CounterElement)
