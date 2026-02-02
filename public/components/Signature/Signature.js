// signature-pad.js
const template = document.createElement('template')
template.innerHTML = `
  <style>
    :host {
      display: block;
      max-width: 600px;
      margin: auto;
    }
    .container {
      border: 1px solid #ccc;
      position: relative;
    }
    canvas {
      width: 100%;
      height: 200px;
      touch-action: none;
      display: block;
    }
    .buttons {
      margin-top: 0.5rem;
      display: flex;
      gap: 0.5rem;
    }
    button {
      flex: 1;
      padding: 0.5rem;
      font-size: 1rem;
      cursor: pointer;
    }
  </style>
  <div class="container">
    <canvas></canvas>
  </div>
  <div class="buttons">
    <button part="clear">Clear</button>
    <button part="save">Save</button>
  </div>
`

export class SignaturePad extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true))
    this._canvas = this.shadowRoot.querySelector('canvas')
    this._ctx = this._canvas.getContext('2d')
    this._clearBtn = this.shadowRoot.querySelector('button[part="clear"]')
    this._saveBtn = this.shadowRoot.querySelector('button[part="save"]')
    this._drawing = false
  }

  connectedCallback () {
    // adjust internal canvas resolution
    const rect = this._canvas.getBoundingClientRect()
    this._canvas.width = rect.width
    this._canvas.height = rect.height

    // event bindings
    this._canvas.addEventListener('mousedown', this._start.bind(this))
    this._canvas.addEventListener('touchstart', this._start.bind(this), { passive: false });
    ['mousemove', 'touchmove'].forEach(evt =>
      this._canvas.addEventListener(evt, this._draw.bind(this), { passive: false })
    );
    ['mouseup', 'mouseout', 'touchend', 'touchcancel'].forEach(evt =>
      this._canvas.addEventListener(evt, this._end.bind(this))
    )

    this._clearBtn.addEventListener('click', () => this.clear())
    this._saveBtn.addEventListener('click', () => this._emitSave())
  }

  _getPos (e) {
    const rect = this._canvas.getBoundingClientRect()
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      }
    }
    return { x: e.offsetX, y: e.offsetY }
  }

  _start (e) {
    e.preventDefault()
    this._drawing = true
    const pos = this._getPos(e)
    this._last = pos
  }

  _draw (e) {
    if (!this._drawing) return
    e.preventDefault()
    const pos = this._getPos(e)
    this._ctx.beginPath()
    this._ctx.moveTo(this._last.x, this._last.y)
    this._ctx.lineTo(pos.x, pos.y)
    this._ctx.strokeStyle = 'black'
    this._ctx.lineWidth = 2
    this._ctx.lineCap = 'round'
    this._ctx.stroke()
    this._last = pos
  }

  _end () {
    this._drawing = false
  }

  /** Clear the signature pad */
  clear () {
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height)
    this.dispatchEvent(new Event('cleared'))
  }

  /** Returns a dataURL PNG of the current signature */
  toDataURL (type = 'image/png') {
    return this._canvas.toDataURL(type)
  }

  _emitSave () {
    const dataUrl = this.toDataURL()
    this.dispatchEvent(new CustomEvent('save', {
      detail: { dataUrl }
    }))
  }
}

customElements.define('signature-pad', SignaturePad)
