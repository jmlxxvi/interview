import { backendRpc } from '../../../js/backend.js'

/**
 * Operation Select Web Component
 *
 * Usage:
 *   <factory-operation id="my-operation" value="uuid-here"></factory-operation>
 *
 * Attributes:
 *   - value: Set/get the selected operation ID
 *   - disabled: Disable the select
 *   - required: Mark as required field
 *   - name: Set the name attribute
 *
 * Properties:
 *   - value: Get/set current value
 *   - disabled: Get/set disabled state
 *   - required: Get/set required state
 *
 * Methods:
 *   - reload(): Reload the operations from the backend
 *
 * Events:
 *   - change: Fired when selection changes
 *
 * Example:
 *   const operation = document.getElementById('my-operation');
 *   operation.value = 'some-uuid';
 *   operation.addEventListener('change', (e) => {
 *     console.log('Selected:', operation.value);
 *   });
 */
class OperationSelectElement extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }

        select {
          display: block;
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont,
                       'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
                       'Helvetica Neue', sans-serif;
          font-size: 1rem;
          line-height: 1.5;
          color: var(--dark, #212529);
          background-color: var(--white, #fff);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
        }

        select:focus {
          color: var(--dark, #212529);
          background-color: var(--white, #fff);
          border-color: var(--primary, #0d6efd);
          outline: 0;
        }

        select:disabled {
          background-color: var(--gray-200, #e9ecef);
          opacity: 1;
        }

        option {
          font-weight: normal;
        }
      </style>
      <select>
        <option value="">Select operation</option>
      </select>
    `

    this.selectElement = this.shadowRoot.querySelector('select')
    this._loaded = false
  }

  async connectedCallback () {
    // Set initial attributes
    if (this.hasAttribute('disabled')) {
      this.selectElement.disabled = true
    }
    if (this.hasAttribute('required')) {
      this.selectElement.required = true
    }
    if (this.hasAttribute('name')) {
      this.selectElement.name = this.getAttribute('name')
    }

    // Load operations
    await this._loadOperations()

    // Set initial value if provided
    if (this.hasAttribute('value')) {
      this.value = this.getAttribute('value')
    }

    // Forward change events
    this.selectElement.addEventListener('change', () => {
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    })
  }

  async _loadOperations () {
    if (this._loaded) return

    try {
      const response = await backendRpc(
        'app/masterdata/operation',
        'listAll',
        {}
      )

      if (response.status.error) {
        console.error('Error loading operations:', response.status.message)
        return
      }

      // Clear existing options except the first one
      this.selectElement.innerHTML = '<option value="">Select operation</option>'

      // Add options
      response.data.forEach(operation => {
        const option = document.createElement('option')
        option.value = operation.id
        option.textContent = `${operation.code} - ${operation.name}`
        this.selectElement.appendChild(option)
      })

      this._loaded = true
    } catch (error) {
      console.error('Error loading operations:', error)
    }
  }

  // Public API
  get value () {
    return this.selectElement.value
  }

  set value (val) {
    this.selectElement.value = val
  }

  get label () {
    const selectedOption = this.selectElement.options[this.selectElement.selectedIndex]
    return selectedOption ? selectedOption.textContent : ''
  }

  get disabled () {
    return this.selectElement.disabled
  }

  set disabled (val) {
    this.selectElement.disabled = Boolean(val)
  }

  get required () {
    return this.selectElement.required
  }

  set required (val) {
    this.selectElement.required = Boolean(val)
  }

  // Method to reload the data
  async reload () {
    this._loaded = false
    await this._loadOperations()
  }

  // Observe attribute changes
  static get observedAttributes () {
    return ['value', 'disabled', 'required']
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (oldValue === newValue) return

    switch (name) {
      case 'value':
        this.value = newValue
        break
      case 'disabled':
        this.disabled = newValue !== null
        break
      case 'required':
        this.required = newValue !== null
        break
    }
  }
}

// Register the custom element
customElements.define('factory-operation', OperationSelectElement)

export { OperationSelectElement }
