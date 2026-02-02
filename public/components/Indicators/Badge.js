class WorkBadge extends HTMLElement {
  static get observedAttributes () {
    return ['status', 'color', 'label']
  }

  constructor () {
    super()
    this.attachShadow({ mode: 'open' })

    // Default color mapping
    this.defaultColors = {
      info: 'var(--info)',
      success: 'var(--success)',
      warning: 'var(--warning)',
      danger: 'var(--danger)',
      default: 'var(--gray-900)'
    }
  }

  connectedCallback () {
    this.render()
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render()
    }
  }

  getStatus () {
    return this.getAttribute('status') || 'default'
  }

  getColor () {
    // Priority: 1. color attribute, 2. default colors by status, 3. fallback
    const customColor = this.getAttribute('color')
    if (customColor) {
      return this.validateColor(customColor)
    }

    const status = this.getStatus()
    return this.defaultColors[status] || this.defaultColors.default
  }

  get label () {
    return this.getAttribute('label') || this.getStatus()
  }

  set label (value) {
    this.setAttribute('label', value)
  }

  validateColor (color) {
    // Check if it's a CSS variable or valid hex color
    if (color.startsWith('var(') || color.startsWith('#')) {
      return color
    }
    // If it's a named color from defaultColors, use that
    if (this.defaultColors[color]) {
      return this.defaultColors[color]
    }
    // Fallback to default
    return this.defaultColors.default
  }

  getDisplayText () {
    // Use label attribute first, then fall back to status
    return this.getAttribute('label') || this.textContent || this.getStatus()
  }

  render () {
    // const status = this.getStatus()
    const color = this.getColor()
    const displayText = this.getDisplayText()

    this.shadowRoot.innerHTML = `
                    <style>
                        .badge {
                            padding: 0.375rem 0.5rem;
                            border-radius: var(--border-radius);
                            background-color: ${color};
                            color: white;
                            font-size: 0.875rem;
                            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont,
                            'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
                            'Helvetica Neue', sans-serif;
                            font-weight: 500;
                            display: inline-block;
                            line-height: 1;
                            white-space: nowrap;
                        }
                    </style>
                    <span class="badge">${displayText}</span>
                `
  }
}

// Register the custom element
customElements.define('app-badge', WorkBadge)
