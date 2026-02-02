class ScribblePad extends HTMLElement {
  static get observedAttributes () {
    // Monitor width, height, and initial-color attributes
    return ['width', 'height', 'initial-color']
  }

  constructor () {
    super()
    this.attachShadow({ mode: 'open' })

    // --- State Properties ---
    this.isDrawing = false
    this.isDrawingStraight = false
    this.isErasing = false
    this.lastX = 0
    this.lastY = 0
    this.startX = 0
    this.startY = 0
    this.history = []
    this.historyStep = -1
    this.HISTORY_MAX = 20

    this.colors = [
      '#000000', '#FF0000', '#0000FF', '#008000', '#FFFF00',
      '#FFA500', '#800080', '#FFC0CB', '#A52A2A', '#808080'
    ]

    // --- Initial Defaults ---
    this.CANVAS_WIDTH_DEFAULT = 800
    this.CANVAS_HEIGHT_DEFAULT = 500
    this.INITIAL_COLOR = '#000000'

    // Properties to hold the final CSS value (e.g., "800px" or "60%")
    this._cssWidth = `${this.CANVAS_WIDTH_DEFAULT}px`
    this._cssHeight = `${this.CANVAS_HEIGHT_DEFAULT}px`

    // Properties to hold the internal drawing buffer size (always pixels)
    this.CANVAS_WIDTH = this.CANVAS_WIDTH_DEFAULT
    this.CANVAS_HEIGHT = this.CANVAS_HEIGHT_DEFAULT

    this.ctx = null
    this.overlayCtx = null
    this.overlayCanvas = null
    this.eraserBtn = null
    this.lineModeBtn = null
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (oldValue !== newValue) {
      const unit = newValue.includes('%') ? '%' : 'px'
      const numericValue = parseFloat(newValue)

      if (name === 'width') {
        this._cssWidth = newValue // Store user value directly (e.g., "60%")

        // Set drawing buffer size only if a pixel value is valid. Otherwise, use default.
        if (unit === 'px' && !isNaN(numericValue)) {
          this.CANVAS_WIDTH = numericValue
          this._cssWidth = `${numericValue}px` // Ensure proper px unit for CSS
        } else {
          // If percentage is used, the drawing buffer is set to the default pixel size.
          this.CANVAS_WIDTH = this.CANVAS_WIDTH_DEFAULT
        }
      } else if (name === 'height') {
        this._cssHeight = newValue // Store user value directly (e.g., "100%")

        if (unit === 'px' && !isNaN(numericValue)) {
          this.CANVAS_HEIGHT = numericValue
          this._cssHeight = `${numericValue}px` // Ensure proper px unit for CSS
        } else {
          // If percentage is used, the drawing buffer is set to the default pixel size.
          this.CANVAS_HEIGHT = this.CANVAS_HEIGHT_DEFAULT
        }
      } else if (name === 'initial-color' && newValue.match(/^#([0-9A-F]{3}){1,2}$/i)) {
        this.INITIAL_COLOR = newValue
      }
    }
  }

  connectedCallback () {
    // --- 1. Define HTML and CSS in the Shadow DOM (using dynamic CSS dimensions) ---
    this.shadowRoot.innerHTML = `
                    <style>
                        :host {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            padding: 20px;
                            font-family: Arial, sans-serif;
                        }

                        h1 { color: #333; }

                        #canvas-container {
                            position: relative;
                            /* 🔥 Apply user-defined CSS size (e.g., "60%" or "800px") */
                            width: ${this._cssWidth}; 
                            height: ${this._cssHeight}; 
                            border: 3px solid #333;
                            background-color: white; 
                        }

                        #scribble-canvas, #overlay-canvas {
                            position: absolute;
                            top: 0;
                            left: 0;
                            display: block;
                            touch-action: none;
                            
                            /* Canvases fill 100% of the container's CSS area */
                            width: 100%;
                            height: 100%;
                        }
                        #scribble-canvas { z-index: 1; }
                        #overlay-canvas { z-index: 2; pointer-events: auto; cursor: crosshair; }

                        /* --- Controls & Buttons (Standard CSS) --- */
                        #controls { margin-top: 20px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
                        button { padding: 10px 15px; font-size: 16px; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.3s; }
                        #eraser-btn { background-color: #ff5722; color: white; }
                        #eraser-btn.active { background-color: #e64a19; }
                        #eraser-btn:hover { background-color: #f4511e; }
                        #line-mode-btn { background-color: #00bcd4; color: white; }
                        #line-mode-btn.active { background-color: #008ba3; }
                        #line-mode-btn:hover { background-color: #00acc1; }
                        #undo-btn { background-color: #ff9800; color: white; }
                        #clear-btn { background-color: #f44336; color: white; }
                        #save-btn { background-color: #4CAF50; color: white; }
                        #undo-btn:hover { background-color: #e68900; }
                        #clear-btn:hover { background-color: #da190b; }
                        #save-btn:hover { background-color: #45a049; }
                        label { font-weight: bold; }
                        #color-pallet { display: flex; gap: 5px; }
                        .color-swatch { width: 25px; height: 25px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2); transition: transform 0.1s, border-color 0.1s; }
                        .color-swatch.selected { border-color: #333; transform: scale(1.1); }
                        .color-swatch:hover { transform: scale(1.15); }
                    </style>

                    <h1>✍️ Handwriting Scribble Pad</h1>

                    <div id="canvas-container">
                        <canvas id="scribble-canvas"></canvas>
                        <canvas id="overlay-canvas"></canvas>
                    </div>

                    <div id="controls">
                        <button id="undo-btn">↩️ Undo (Ctrl+Z)</button>
                        <button id="clear-btn">Clear Canvas</button>
                        <button id="eraser-btn">🧼 Eraser</button>
                        <button id="line-mode-btn">➖ Draw Straight Line</button>
                        <label>Color:</label>
                        <div id="color-pallet"></div>
                        <label for="line-width">Thickness:</label>
                        <input type="range" id="line-width" min="1" max="50" value="5">
                        <button id="save-btn">Download Image</button>
                    </div>
                `

    // --- 2. Initialize Canvas and Logic ---
    this.initializeCanvas()
  }

  // NOTE: The handleResize and ResizeObserver logic have been removed.

  initializeCanvas () {
    const mainCanvas = this.shadowRoot.getElementById('scribble-canvas')
    this.ctx = mainCanvas.getContext('2d')

    this.overlayCanvas = this.shadowRoot.getElementById('overlay-canvas')
    this.overlayCtx = this.overlayCanvas.getContext('2d')

    const lineWidthInput = this.shadowRoot.getElementById('line-width')
    const undoBtn = this.shadowRoot.getElementById('undo-btn')
    const clearBtn = this.shadowRoot.getElementById('clear-btn')
    const saveBtn = this.shadowRoot.getElementById('save-btn')
    this.lineModeBtn = this.shadowRoot.getElementById('line-mode-btn')
    this.eraserBtn = this.shadowRoot.getElementById('eraser-btn')

    // Set the internal drawing buffer size (always pixels)
    mainCanvas.width = this.CANVAS_WIDTH
    mainCanvas.height = this.CANVAS_HEIGHT
    this.overlayCanvas.width = this.CANVAS_WIDTH
    this.overlayCanvas.height = this.CANVAS_HEIGHT

    // 🔥 ADD THIS STEP: Fill the entire canvas with white
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT)

    // Reset fillStyle if you need it later, though it's typically unused for line drawing
    // this.ctx.fillStyle = '#000000'; // Reset fill back to black (default)

    // Set initial drawing styles
    this.ctx.strokeStyle = this.INITIAL_COLOR
    this.ctx.lineJoin = 'round'
    this.ctx.lineCap = 'round'
    this.ctx.lineWidth = parseInt(lineWidthInput.value)

    // --- Event Listeners Setup (Touch Fix Applied) ---
    // --- Inside initializeCanvas() method ---

    // Store the bound mouse position getter for clean use
    const getMousePosBound = this.getMousePos.bind(this)

    // Mouse handlers (use the bound function)
    this.overlayCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e, getMousePosBound))
    this.overlayCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e, getMousePosBound))
    this.overlayCanvas.addEventListener('mouseup', (e) => this.stopDrawing(e, getMousePosBound))

    // Fix the mouseleave handler as well, which also calls stopDrawing
    this.overlayCanvas.addEventListener('mouseleave', (e) => {
      if (this.isDrawing && !this.isDrawingStraight) this.stopDrawing(e, getMousePosBound)
      this.overlayCtx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT)
    })

    // Touch handlers (already correctly bound)
    this.overlayCanvas.addEventListener('touchstart', (e) => this.handleMouseDown(e, this.getTouchPos.bind(this), true))
    this.overlayCanvas.addEventListener('touchmove', (e) => this.handleMouseMove(e, this.getTouchPos.bind(this), true))
    this.overlayCanvas.addEventListener('touchend', (e) => this.stopDrawing(e, this.getTouchPos.bind(this)))
    this.overlayCanvas.addEventListener('touchcancel', (e) => this.stopDrawing(e, this.getTouchPos.bind(this)))

    // Control buttons
    this.eraserBtn.addEventListener('click', () => this.resetTools(this.isErasing ? 'pen' : 'eraser'))
    this.lineModeBtn.addEventListener('click', () => this.resetTools(this.isDrawingStraight ? 'pen' : 'straight'))
    lineWidthInput.addEventListener('input', (e) => { this.ctx.lineWidth = parseInt(e.target.value) })

    // Action buttons
    undoBtn.addEventListener('click', () => this.undo())
    clearBtn.addEventListener('click', () => this.clearCanvas())
    saveBtn.addEventListener('click', () => this.saveImage())

    this.shadowRoot.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        this.undo()
      }
    })

    this.setupColorPallet()
    this.saveState()
  }

  // --- 3. HELPER METHODS ---
  // --- Inside ScribblePad class ---
  // --- Inside ScribblePad class ---
  getMousePos (e) {
    // Now that getMousePos is bound to 'this', we can safely access instance properties:
    const rect = this.overlayCanvas.getBoundingClientRect()

    // Calculate the scaling ratio: (Internal Pixel Size) / (CSS Rendered Size)
    const scaleX = this.CANVAS_WIDTH / rect.width
    const scaleY = this.CANVAS_HEIGHT / rect.height

    // Apply the scaling ratio to the mouse position relative to the element
    return {
      x: e.offsetX * scaleX,
      y: e.offsetY * scaleY
    }
  }

  // --- Inside ScribblePad class ---
  getTouchPos (e) {
    const rect = this.overlayCanvas.getBoundingClientRect()
    const touchList = e.touches && e.touches.length ? e.touches : e.changedTouches
    const touch = touchList[0]

    // Calculate the scaling ratio: (Internal Pixel Size) / (CSS Rendered Size)
    const scaleX = this.CANVAS_WIDTH / rect.width
    const scaleY = this.CANVAS_HEIGHT / rect.height

    return {
      // Calculate raw position relative to element, then scale
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    }
  }

  // --- 4. DRAWING AND EVENT HANDLER METHODS ---

  draw (x, y) {
    if (!this.isDrawing) return
    this.ctx.globalCompositeOperation = this.isErasing ? 'destination-out' : 'source-over'
    this.ctx.beginPath()
    this.ctx.moveTo(this.lastX, this.lastY)
    this.ctx.lineTo(x, y)
    this.ctx.stroke()
    this.lastX = x
    this.lastY = y
  }

  drawStraightLine (endX, endY, isFinal) {
    this.ctx.globalCompositeOperation = 'source-over'

    if (!isFinal) {
      this.overlayCtx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT)
      this.overlayCtx.strokeStyle = this.ctx.strokeStyle
      this.overlayCtx.lineWidth = this.ctx.lineWidth
      this.overlayCtx.lineCap = this.ctx.lineCap
      this.overlayCtx.lineJoin = this.ctx.lineJoin
      this.overlayCtx.beginPath()
      this.overlayCtx.moveTo(this.startX, this.startY)
      this.overlayCtx.lineTo(endX, endY)
      this.overlayCtx.stroke()
    } else {
      this.overlayCtx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT)
      this.ctx.beginPath()
      this.ctx.moveTo(this.startX, this.startY)
      this.ctx.lineTo(endX, endY)
      this.ctx.stroke()
      this.saveState()
    }
  }

  drawEraserPreview (x, y) {
    this.overlayCtx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT)
    this.overlayCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
    this.overlayCtx.lineWidth = 1
    this.overlayCtx.beginPath()
    const radius = this.ctx.lineWidth / 2
    this.overlayCtx.arc(x, y, radius, 0, Math.PI * 2, false)
    this.overlayCtx.stroke()
  }

  handleMouseDown (e, posGetter, preventDefault = false) {
    if (preventDefault) e.preventDefault()
    const pos = posGetter(e)
    this.isDrawing = true
    this.lastX = pos.x
    this.lastY = pos.y
    this.startX = pos.x
    this.startY = pos.y
    if (this.isErasing) {
      this.overlayCtx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT)
    }
  }

  handleMouseMove (e, posGetter, preventDefault = false) {
    if (preventDefault) e.preventDefault()
    const pos = posGetter(e)

    if (this.isDrawing) {
      if (this.isDrawingStraight) {
        this.drawStraightLine(pos.x, pos.y, false)
      } else {
        this.draw(pos.x, pos.y)
      }
    } else if (this.isErasing && !preventDefault) {
      this.drawEraserPreview(pos.x, pos.y)
    }
  }

  stopDrawing (e, posGetter) {
    if (!this.isDrawing) return
    this.isDrawing = false

    if (this.isDrawingStraight) {
      const pos = posGetter(e)
      this.drawStraightLine(pos.x, pos.y, true)
    } else {
      this.saveState()
    }

    this.ctx.globalCompositeOperation = 'source-over'

    if (this.isErasing && e && posGetter === this.getMousePos) {
      const pos = posGetter(e)
      this.drawEraserPreview(pos.x, pos.y)
    }
  }

  // --- 5. HISTORY AND CONTROL METHODS ---

  restoreCanvas (dataURL) {
    const img = new Image()
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT)
      this.ctx.drawImage(img, 0, 0)
    }
    img.src = dataURL
  }

  saveState () {
    if (this.historyStep < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyStep + 1)
    }

    const dataURL = this.ctx.canvas.toDataURL()
    this.history.push(dataURL)
    this.historyStep++

    if (this.history.length > this.HISTORY_MAX) {
      this.history.shift()
      this.historyStep--
    }
  }

  undo () {
    if (this.historyStep <= 0) {
      this.ctx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT)
      this.historyStep = -1
      return
    }
    this.historyStep--
    this.restoreCanvas(this.history[this.historyStep])
  }

  clearCanvas () {
    this.ctx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT)
    this.overlayCtx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT)
    this.saveState()
  }

  saveImage () {
    const dataURL = this.ctx.canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataURL
    a.download = 'scribble-image.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  setupColorPallet () {
    const colorPallet = this.shadowRoot.getElementById('color-pallet')

    const isDefaultBlack = this.INITIAL_COLOR === '#000000'
    if (!isDefaultBlack && !this.colors.includes(this.INITIAL_COLOR.toUpperCase())) {
      this.colors.unshift(this.INITIAL_COLOR)
    }

    this.colors.forEach((color, index) => {
      const swatch = document.createElement('div')
      swatch.className = 'color-swatch'
      swatch.style.backgroundColor = color
      swatch.setAttribute('data-color', color.toUpperCase())

      if (color.toUpperCase() === this.INITIAL_COLOR.toUpperCase()) {
        swatch.classList.add('selected')
      }

      swatch.addEventListener('click', () => {
        this.ctx.strokeStyle = color
        this.shadowRoot.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'))
        swatch.classList.add('selected')
        this.resetTools(this.isErasing ? 'pen' : (this.isDrawingStraight ? 'straight' : 'pen'))
      })
      colorPallet.appendChild(swatch)
    })
  }

  resetTools (currentTool) {
    this.isErasing = (currentTool === 'eraser')
    this.isDrawingStraight = (currentTool === 'straight')

    this.eraserBtn.classList.toggle('active', this.isErasing)
    this.lineModeBtn.classList.toggle('active', this.isDrawingStraight)

    if (this.isErasing) {
      this.shadowRoot.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'))
    } else {
      const activeColor = this.ctx.strokeStyle.toUpperCase()
      this.shadowRoot.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'))
      const matchingSwatch = this.shadowRoot.querySelector(`.color-swatch[data-color="${activeColor}"]`)
      if (matchingSwatch) {
        matchingSwatch.classList.add('selected')
      }
    }

    this.overlayCtx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT)
  }

  getImageDataURL () {
    // Access the drawing context's canvas property
    return this.ctx.canvas.toDataURL('image/png')
  }
}

customElements.define('scribble-pad', ScribblePad)
