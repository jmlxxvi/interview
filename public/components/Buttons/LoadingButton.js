class LoadingButton extends HTMLElement {
  connectedCallback () {
    const classes = this.getAttribute('classes') || ''
    const labelText = this.textContent.trim()
    const onclickAttr = this.getAttribute('onclick')

    // Clear initial content
    this.innerHTML = ''

    // Use template string for inner HTML
    this.innerHTML = `
        <button class="button primary ${classes}" style="position: relative;">
          <span class="label">${labelText}</span>
          <span class="button-spinner" style="display:none;"></span>
        </button>
      `

    this.button = this.querySelector('button')
    this.label = this.button.querySelector('.label')
    this.spinner = this.button.querySelector('.button-spinner')

    // Wrap onclick attribute
    if (onclickAttr) {
      this.button.onclick = async (event) => {
        this.setLoading(true)
        try {
          // eslint-disable-next-line no-new-func
          await new Function('event', onclickAttr).call(this, event)
        } finally {
          this.setLoading(false)
        }
      }
    }

    this.button.addEventListener('click', async () => {
      if (this._action) {
        this.setLoading(true)
        try {
          await this._action()
        } finally {
          this.setLoading(false)
        }
      }
    })
  }

  setLoading (isLoading) {
    this.spinner.style.display = isLoading ? 'inline-block' : 'none'
    this.button.disabled = isLoading
  }

  set action (callback) {
    this._action = callback
  }

  get action () {
    return this._action
  }
}

// Define the custom element
customElements.define('loading-button', LoadingButton)
