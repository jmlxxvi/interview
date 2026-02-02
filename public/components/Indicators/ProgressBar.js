export class ProgressBar extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })

    this.shadowRoot.innerHTML = `
          <style>
            .container {
              width: 100%;
              background: var(--gray-100);
              overflow: hidden;
              height: 1.2rem;
            }
            .bar {
              height: 100%;
              width: 0%;
              background-color: var(--gray-900);
              color: white;
              text-align: center;
              font-size: 0.8rem;
              line-height: 1.2rem;
              transition: width 0.2s ease-in-out;
            }
          </style>
          <div class="container">
            <div class="bar">0%</div>
          </div>
        `
    this.bar = this.shadowRoot.querySelector('.bar')
  }

  static get observedAttributes () {
    return ['value']
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'value') {
      this.setProgress(newValue)
    }
  }

  setProgress (percent) {
    percent = Math.min(Math.max(percent, 0), 100) // clamp between 0–100
    this.bar.style.width = percent + '%'
    this.bar.textContent = percent + '%'
  }
}

customElements.define('progress-bar', ProgressBar)
