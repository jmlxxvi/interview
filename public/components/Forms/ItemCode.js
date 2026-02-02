class AppItemCode extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.render()
  }

  static get observedAttributes () {
    return ['code']
  }

  connectedCallback () {
    this.render()
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'code') {
      this.render()
    }
  }

  render () {
    const code = this.getAttribute('code') || ''
    const textContent = this.textContent

    this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                }
                
                .container {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .code {
                    font-size: smaller;
                    color: var(--gray-600, #6b7280);
                }
            </style>
            <div class="container">
                <div>
                    <strong>${textContent}</strong>
                    <div class="code">${code}</div>
                </div>
            </div>
        `
  }
}

customElements.define('app-item-code', AppItemCode)
