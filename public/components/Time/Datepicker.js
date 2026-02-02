import { i18nUnixToDate } from '../../js/i18n.js'

class DatePicker extends HTMLElement {
  static get observedAttributes () { return ['placeholder', 'value', 'min', 'max', 'format', 'locale'] }

  constructor () {
    super()
    this.attachShadow({ mode: 'open' })

    const toYMD = (d) => {
      if (!d) return ''
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    const parseYMD = (s) => {
      if (!s) return null
      const [y, m, d] = s.split('-').map(Number)
      return new Date(y, m - 1, d)
    }

    // TODO are using i18nUnixToDate here to make date formatting consistent
    // effectively replacing the previous manual formatting logic
    const formatDate = (date) => {
      return i18nUnixToDate(date.getTime() / 1000, false)

      // const format = this._format
      // const locale = this._locale

      // const dd = String(date.getDate()).padStart(2, '0')
      // const d = String(date.getDate())
      // const mm = String(date.getMonth() + 1).padStart(2, '0')
      // const m = String(date.getMonth() + 1)
      // const yyyy = String(date.getFullYear())
      // const yy = yyyy.slice(-2)

      // const monthFull = new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)
      // const monthShort = new Intl.DateTimeFormat(locale, { month: 'short' }).format(date)

      // return format
      //   .replace(/DD/g, dd)
      //   .replace(/\bD\b/g, d)
      //   .replace(/MM/g, mm)
      //   .replace(/\bM\b/g, m)
      //   .replace(/Month/g, monthFull)
      //   .replace(/month/g, monthFull.toLowerCase())
      //   .replace(/Mon/g, monthShort)
      //   .replace(/mon/g, monthShort.toLowerCase())
      //   .replace(/YYYY/g, yyyy)
      //   .replace(/YY/g, yy)
    }
    this._helpers = { toYMD, parseYMD, formatDate }

    // Build markup using a template string
    const template = `
            <style>
                :host {
                    display: block;
                }

                *,
                *::before,
                *::after {
                    box-sizing: border-box;
                    font-family: inherit;
                    font-size: inherit;
                    color: inherit;
                }

                .container {
                    position: relative;
                    display: inline-block;
                    width: 100%;
                }

                .icon {
                    position: absolute;
                    left: 0.75rem;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 1.1rem;
                    height: 1.1rem;
                    pointer-events: none;
                }

                .input {
                    display: block;
                    width: 100%;
                    padding: 0.5rem 0rem 0.5rem 2.2rem;
                    font-size: 1rem;
                    line-height: 1.5;
                    color: var(--dark);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                }

                .input:focus {
                    border-color: var(--gray-900);
                    caret-color: var(--gray-900);
                    outline: none;
                    box-shadow: none;
                }

                .input::placeholder {
                    color: #9ca3af;
                }

                .calendar {
                    position: absolute;
                    top: calc(100% + 8px);
                    left: 0;
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: var(--border-radius);
                    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
                    padding: 10px;
                    display: none;
                    z-index: 9999;
                    width: 260px;
                    user-select: none;
                }

                .calendar.visible {
                    display: block;
                }

                .header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    gap: 8px;
                }

                .nav-btn {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 0;
                    font-size: 14px;
                }

                .nav-btn:hover {
                    background: var(--gray-200);
                }

                .year-select {
                    font-size: .8rem;
                    padding: 2px;
                    border-radius: var(--border-radius);
                }

                .month-label {
                    font-weight: 600;
                    min-width: 80px;
                    text-align: center;
                }

                .weekdays,
                .days {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 4px;
                }

                .weekday {
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }

                .day {
                    text-align: center;
                    padding: 6px 4px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                }

                .day:hover {
                    background: #f0f4ff;
                }

                .day.selected {
                    background: var(--gray-900);
                    color: white;
                }

                .day.focused {
                    box-shadow: 0 0 0 2px rgba(30, 123, 228, 0.18) inset;
                }

                .day.disabled {
                    color: #aaa;
                    cursor: not-allowed;
                    opacity: 0.6;
                    pointer-events: none;
                    background: transparent;
                }
            </style>

            <div class="container">
                <svg class="icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                    fill="var(--gray-900)">
                    <path
                        d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Zm280 240q-17 0-28.5-11.5T440-440q0-17 11.5-28.5T480-480q17 0 28.5 11.5T520-440q0 17-11.5 28.5T480-400Zm-160 0q-17 0-28.5-11.5T280-440q0-17 11.5-28.5T320-480q17 0 28.5 11.5T360-440q0 17-11.5 28.5T320-400Zm320 0q-17 0-28.5-11.5T600-440q0-17 11.5-28.5T640-480q17 0 28.5 11.5T680-440q0 17-11.5 28.5T640-400ZM480-240q-17 0-28.5-11.5T440-280q0-17 11.5-28.5T480-320q17 0 28.5 11.5T520-280q0 17-11.5 28.5T480-240Zm-160 0q-17 0-28.5-11.5T280-280q0-17 11.5-28.5T320-320q17 0 28.5 11.5T360-280q0 17-11.5 28.5T320-240Zm320 0q-17 0-28.5-11.5T600-280q0-17 11.5-28.5T640-320q17 0 28.5 11.5T680-280q0 17-11.5 28.5T640-240Z" />
                </svg>
                <input type="text" class="input" readonly>
                <div class="calendar"></div>
            </div>
        `

    // Inject into shadow DOM or your chosen container
    this.shadowRoot.innerHTML = template

    // Get references to elements
    this._container = this.shadowRoot.querySelector('.container')
    this._icon = this.shadowRoot.querySelector('.icon')
    this._input = this.shadowRoot.querySelector('.input')
    this._calendar = this.shadowRoot.querySelector('.calendar')

    // this.shadowRoot.append(style, container);

    this._selectedDate = null
    this._currentMonth = new Date()
    this._focusDate = null
    this._minDate = null
    this._maxDate = null

    this._onDocClick = (e) => {
      const path = e.composedPath ? e.composedPath() : []
      if (!path.includes(this) && !this.shadowRoot.contains(e.target)) this.closeCalendar()
    }

    this._input.addEventListener('click', () => this.toggleCalendar())
    this.shadowRoot.addEventListener('keydown', (ev) => this._onKeyDown(ev))
  }

  connectedCallback () {
    this._input.placeholder = this.getAttribute('placeholder') || 'Date'
    if (this.hasAttribute('value')) this.value = this.getAttribute('value')
    if (this.hasAttribute('min')) this.min = this.getAttribute('min')
    if (this.hasAttribute('max')) this.max = this.getAttribute('max')
    this._format = this.getAttribute('format') || 'YYYY-MM-DD'
    // this._locale = this.getAttribute('locale') || navigator.language || 'en-US';
    this._locale = this.getAttribute('locale') || 'es-AR'
    document.addEventListener('click', this._onDocClick)
  }

  disconnectedCallback () { document.removeEventListener('click', this._onDocClick) }

  attributeChangedCallback (name, oldVal, newVal) {
    if (name === 'placeholder') this._input.placeholder = newVal || ''
    if (name === 'value') this.value = newVal || ''
    if (name === 'min') this.min = newVal || ''
    if (name === 'max') this.max = newVal || ''
    if (name === 'format') this._format = newVal
    if (name === 'locale') this._locale = newVal
  }

  getTimestamp (milliseconds = false) {
    const divider = milliseconds ? 1 : 1000
    return this._selectedDate
      ? Math.floor(this._selectedDate.getTime() / divider)
      : null
  }

  setTimestamp (unixTs, milliseconds = false) {
    const multiplier = milliseconds ? 1 : 1000
    if (typeof unixTs !== 'number') {
      console.error('Expected a number')
      // Make sure to clear the selected date if input is invalid
      this._selectedDate = null
      this._updateInput()
      return
    }
    this._selectedDate = new Date(unixTs * multiplier)
    this._updateInput()
  }

  // ---
  // API
  // ---
  get format () { return this._format }
  set format (v) {
    this._format = v
    this._updateInput()
    this._renderCalendar()
  }

  get value () { return this._selectedDate ? this._helpers.toYMD(this._selectedDate) : '' }
  set value (v) {
    this._selectedDate = v ? this._helpers.parseYMD(v) : null
    if (this._selectedDate) this._currentMonth = new Date(this._selectedDate.getFullYear(), this._selectedDate.getMonth(), 1)
    this._focusDate = this._selectedDate || new Date(this._currentMonth)
    this._updateInput()
    this._renderCalendar()
  }

  // Returns UTC Unix timestamp (seconds since epoch)
  get timestamp () {
    return this.getTimestamp()
  }

  set timestamp (unixTs) {
    this.setTimestamp(unixTs, false)
  }

  get timestampMilliseconds () {
    return this.getTimestamp(true)
  }

  set timestampMilliseconds (unixTs) {
    this.setTimestamp(unixTs, true)
  }

  get min () { return this._minDate ? this._helpers.toYMD(this._minDate) : '' }
  set min (v) { this._minDate = v ? this._helpers.parseYMD(v) : null; this._renderCalendar() }

  get max () { return this._maxDate ? this._helpers.toYMD(this._maxDate) : '' }
  set max (v) { this._maxDate = v ? this._helpers.parseYMD(v) : null; this._renderCalendar() }

  toggleCalendar () {
    if (this._calendar.classList.contains('visible')) this.closeCalendar()
    else this.openCalendar()
  }

  openCalendar () {
    this._calendar.classList.add('visible')
    this._focusDate = this._selectedDate || new Date(this._currentMonth)
    this._renderCalendar()
  }

  closeCalendar () { this._calendar.classList.remove('visible') }

  _updateInput () { this._input.value = this._selectedDate ? this._helpers.formatDate(this._selectedDate) : '' }

  _renderCalendar () {
    const toYMD = this._helpers.toYMD
    this._calendar.innerHTML = ''

    const header = document.createElement('div')
    header.className = 'header'

    const prevBtn = document.createElement('button')
    prevBtn.className = 'nav-btn'
    prevBtn.innerHTML = `
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                          </svg>
                        `
    prevBtn.addEventListener('click', () => {
      this._currentMonth.setMonth(this._currentMonth.getMonth() - 1)
      this._renderCalendar()
    })

    const nextBtn = document.createElement('button')
    nextBtn.className = 'nav-btn'
    nextBtn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                          `
    nextBtn.addEventListener('click', () => {
      this._currentMonth.setMonth(this._currentMonth.getMonth() + 1)
      this._renderCalendar()
    })

    // Year dropdown
    const yearSelect = document.createElement('select')
    yearSelect.className = 'year-select'
    const currentYear = this._currentMonth.getFullYear()
    const startYear = (this._minDate ? this._minDate.getFullYear() : currentYear - 50)
    const endYear = (this._maxDate ? this._maxDate.getFullYear() : currentYear + 50)
    for (let y = startYear; y <= endYear; y++) {
      const opt = document.createElement('option')
      opt.value = y
      opt.textContent = y
      if (y === currentYear) opt.selected = true
      yearSelect.appendChild(opt)
    }
    yearSelect.addEventListener('change', (e) => {
      this._currentMonth.setFullYear(Number(e.target.value))
      this._renderCalendar()
    })

    const monthLabel = document.createElement('div')
    monthLabel.className = 'month-label'
    monthLabel.textContent = new Intl.DateTimeFormat(this._locale, { month: 'long' }).format(this._currentMonth)

    header.append(prevBtn, monthLabel, yearSelect, nextBtn)
    this._calendar.appendChild(header)

    const weekdays = document.createElement('div')
    weekdays.className = 'weekdays'
    for (let i = 0; i < 7; i++) {
      const d = new Date(1970, 0, i + 4) // Sunday=0
      const wd = new Intl.DateTimeFormat(this._locale, { weekday: 'short' }).format(d)
      const el = document.createElement('div'); el.className = 'weekday'; el.textContent = wd; weekdays.appendChild(el)
    }
    this._calendar.appendChild(weekdays)

    const daysGrid = document.createElement('div')
    daysGrid.className = 'days'

    const year = this._currentMonth.getFullYear()
    const month = this._currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startIndex = firstDay.getDay()

    for (let i = 0; i < startIndex; i++) daysGrid.appendChild(document.createElement('div'))
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d)
      const iso = toYMD(date)
      const dayEl = document.createElement('div')
      dayEl.className = 'day'
      dayEl.textContent = d

      const disabled = (this._minDate && iso < toYMD(this._minDate)) ||
                (this._maxDate && iso > toYMD(this._maxDate))
      if (disabled) dayEl.classList.add('disabled')
      if (this._selectedDate && iso === toYMD(this._selectedDate)) dayEl.classList.add('selected')
      if (this._focusDate && iso === toYMD(this._focusDate)) dayEl.classList.add('focused')

      if (!disabled) {
        dayEl.addEventListener('click', () => this._selectDate(date))
      }

      daysGrid.appendChild(dayEl)
    }
    this._calendar.appendChild(daysGrid)
  }

  _selectDate (date) {
    this._selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    this._currentMonth = new Date(this._selectedDate.getFullYear(), this._selectedDate.getMonth(), 1)
    this._focusDate = new Date(this._selectedDate)
    this._updateInput()
    this._renderCalendar()
    this.closeCalendar()
    this.dispatchEvent(
      new CustomEvent(
        'date-selected',
        {
          detail: {
            date: new Date(this._selectedDate),
            timestamp: this.getTimestamp(),
            timestampMilliseconds: this.getTimestamp(true)
          }
        }
      )
    )
  }

  _onKeyDown (ev) {
    const isOpen = this._calendar.classList.contains('visible')
    if (!isOpen && (ev.key === 'ArrowDown' || ev.key === 'Enter')) {
      ev.preventDefault(); this.openCalendar(); return
    }
    if (!isOpen) return

    const moveFocusByDays = (n) => {
      this._focusDate = this._focusDate || new Date(this._currentMonth)
      this._focusDate.setDate(this._focusDate.getDate() + n)
      this._currentMonth = new Date(this._focusDate.getFullYear(), this._focusDate.getMonth(), 1)
      this._renderCalendar()
    }

    switch (ev.key) {
      case 'ArrowLeft': ev.preventDefault(); moveFocusByDays(-1); break
      case 'ArrowRight': ev.preventDefault(); moveFocusByDays(1); break
      case 'ArrowUp': ev.preventDefault(); moveFocusByDays(-7); break
      case 'ArrowDown': ev.preventDefault(); moveFocusByDays(7); break
      case 'PageUp': ev.preventDefault(); this._currentMonth.setMonth(this._currentMonth.getMonth() - 1); this._renderCalendar(); break
      case 'PageDown': ev.preventDefault(); this._currentMonth.setMonth(this._currentMonth.getMonth() + 1); this._renderCalendar(); break
      case 'Home': ev.preventDefault(); this._focusDate = new Date(this._currentMonth.getFullYear(), this._currentMonth.getMonth(), 1); this._renderCalendar(); break
      case 'End': ev.preventDefault(); this._focusDate = new Date(this._currentMonth.getFullYear(), this._currentMonth.getMonth() + 1, 0); this._renderCalendar(); break
      case 'Enter': ev.preventDefault(); if (this._focusDate) this._selectDate(this._focusDate); break
      case 'Escape': ev.preventDefault(); this.closeCalendar(); break
    }
  }
}
customElements.define('date-picker', DatePicker)
