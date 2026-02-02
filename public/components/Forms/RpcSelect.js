import { backendRpc } from '../../js/backend.js'

/**
 * Generic RPC Select Web Component
 *
 * Usage:
 *   <rpc-select
 *     id="my-select"
 *     module="app/masterdata/operation"
 *     function="listAll"
 *     value-field="id"
 *     label-field="name"
 *     placeholder="Select operation"
 *     value="uuid-here">
 *   </rpc-select>
 *
 * Attributes:
 *   - module: The RPC module path (e.g., 'app/masterdata/operation')
 *   - function: The RPC function name (e.g., 'listAll')
 *   - params: JSON string of parameters to pass to the RPC function (optional, default: '{}')
 *   - value-field: Field name to use as option value (default: 'id')
 *   - label-field: Field name or template to use as option text (default: 'name')
 *                  Supports templates like "{code} - {name}" to combine multiple fields
 *   - placeholder: Placeholder text for empty option (default: 'Select...')
 *   - value: Set/get the selected value
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
 *   - reload(): Reload the data from the backend
 *
 * Events:
 *   - change: Fired when selection changes
 *
 * Example:
 *   <rpc-select
 *     mod="app/masterdata/product"
 *     fun="findAll"
 *     label-field="name"
 *     placeholder="Select product">
 *   </rpc-select>
 *
 * <!-- Operations select -->
 * <rpc-select
 *   mod="app/masterdata/operation"
 *   fun="listAll"
 *   label-field="name"
 *   placeholder="Select operation">
 * </rpc-select>
 *
 * <!-- Products select - if you want to show code -->
 * <rpc-select
 *   mod="app/masterdata/product"
 *   fun="findAll"
 *   label-field="code"
 *   placeholder="Select product">
 * </rpc-select>
 *
 * <!-- Work centers with name field -->
 * <rpc-select
 *   mod="app/masterdata/work_center"
 *   fun="listAll"
 *   label-field="name"
 *   placeholder="Select work center">
 * </rpc-select>
 *
 * <!-- Products with combined code and name -->
 * <rpc-select
 *   mod="app/masterdata/product"
 *   fun="findAll"
 *   label-field="{code} - {name}"
 *   placeholder="Select product">
 * </rpc-select>
 *
 * <!-- Vendors with code and name -->
 * <rpc-select
 *   mod="app/masterdata/vendor"
 *   fun="listAll"
 *   label-field="{code} - {name}"
 *   placeholder="Select vendor">
 * </rpc-select>
 * <!-- Simple field (original behavior) -->
 * <rpc-select
 *   mod="app/masterdata/product"
 *   fun="findAll"
 *   label-field="name"
 *   placeholder="Select product">
 * </rpc-select>
 *
 * <!-- Combined fields with template -->
 * <rpc-select
 *   mod="app/masterdata/product"
 *   fun="findAll"
 *   label-field="{code} - {name}"
 *   placeholder="Select product">
 * </rpc-select>
 *
 * <!-- Vendors with code and name -->
 * <rpc-select
 *   mod="app/masterdata/vendor"
 *   fun="listAll"
 *   label-field="{code} - {name}"
 *   placeholder="Select vendor">
 * </rpc-select>
 */
class RpcSelectElement extends HTMLElement {
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
        <option value="">Loading...</option>
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

    // Load data
    await this._loadData()

    // Set initial value if provided
    if (this.hasAttribute('value')) {
      this.value = this.getAttribute('value')
    }

    // Forward change events
    this.selectElement.addEventListener('change', () => {
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    })
  }

  _formatLabel (item, labelField) {
    // Check if labelField contains template syntax (e.g., "{code} - {name}")
    if (labelField.includes('{') && labelField.includes('}')) {
      // Replace all {fieldName} with actual values
      return labelField.replace(/\{(\w+)\}/g, (match, fieldName) => {
        return item[fieldName] !== undefined && item[fieldName] !== null ? item[fieldName] : ''
      })
    }

    // Simple field lookup
    return item[labelField] || item.name || item.code || ''
  }

  async _loadData () {
    if (this._loaded) return

    const mod = this.getAttribute('mod')
    const fun = this.getAttribute('fun')
    const argsStr = this.getAttribute('args') || '{}'
    const placeholder = this.getAttribute('placeholder') || 'Select...'

    if (!mod || !fun) {
      console.error('RpcSelect: module and function attributes are required')
      this.selectElement.innerHTML = '<option value="">Error: missing attributes</option>'
      return
    }

    let args
    try {
      args = JSON.parse(argsStr)
    } catch (error) {
      console.error('RpcSelect: invalid args JSON', error)
      this.selectElement.innerHTML = '<option value="">Error: invalid args</option>'
      return
    }

    try {
      const response = await backendRpc(mod, fun, args)

      if (response.status.error) {
        console.error(`Error loading data from ${mod}::${fun}:`, response.status.message)
        this.selectElement.innerHTML = '<option value="">Error loading data</option>'
        return
      }

      // Clear existing options
      this.selectElement.innerHTML = `<option value="">${placeholder}</option>`

      // Get configuration
      const valueField = this.getAttribute('value-field') || 'id'
      const labelField = this.getAttribute('label-field') || 'name'

      // Add options
      const data = response.data || []
      data.forEach(item => {
        const option = document.createElement('option')
        option.value = item[valueField]
        option.textContent = this._formatLabel(item, labelField)

        this.selectElement.appendChild(option)
      })

      this._loaded = true
    } catch (error) {
      console.error(`Error loading data from ${mod}::${fun}:`, error)
      this.selectElement.innerHTML = '<option value="">Error loading data</option>'
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
    if (this.value === '') return ''
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
    await this._loadData()
  }

  // Observe attribute changes
  static get observedAttributes () {
    return ['value', 'label', 'disabled', 'required', 'mod', 'fun', 'args']
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
      case 'mod':
      case 'fun':
      case 'args':
        // Reload data when RPC parameters change
        this._loaded = false
        this._loadData()
        break
    }
  }
}

// Register the custom element
customElements.define('rpc-select', RpcSelectElement)

export { RpcSelectElement }
