// import { eventsDispatch } from '../../js/events.js'

class SelectElement extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })

    const template = document.createElement('template')
    template.innerHTML = `
        <style>
            .dropdown {
                position: relative;
                display: inline-block;
                width: 100%;
            }

            .dropdown-trigger {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 1rem;
                color: var(--dark);
                cursor: pointer;
            }
  
            .dropdown-menu {
                display: none;
                position: absolute;
                top: 100%;
                left: 0;
                width: 100%;
                background-color: var(--white);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius);
                z-index: 1000;
                max-height: 15rem;
                overflow: hidden; /* Ensure no items overflow the dropdown menu */
                flex-direction: column; /* Split into two rows */
            }

            .dropdown-menu input[type="text"] {
                flex-shrink: 0; /* Prevent input from shrinking */
                width: calc(100% - 2rem);
                margin: 0.5rem;
                padding: 0.375rem;
                font-size: 1rem;
                border: 1px solid var(--border-color, #ced4da);
                border-radius: var(--border-radius, 0.375rem);
                background-color: var(--white);
                z-index: 10; /* Keep input above list */
            }
  
            .dropdown-menu.open {
                display: flex;
            }

            .dropdown-list {
                flex-grow: 1; /* Allow the list to take up remaining space */
                overflow-y: auto; /* Enable scrolling only for the list */
                padding: 0;
            }
  
            .dropdown-item {
                padding: 0.5rem 1rem;
                font-size: 1rem;
                cursor: pointer;
            }

            .dropdown-item:hover {
                background-color: var(--gray-100);
            }
        </style>
        <div class="dropdown">
          <div class="dropdown-trigger">Select an option</div>
          <div class="dropdown-menu">
            <input type="text" placeholder="Type to filter..." />
            <div class="dropdown-list">
              <div class="dropdown-item">Loading...</div>
            </div>
          </div>
        </div>
      `
    this.shadowRoot.appendChild(template.content.cloneNode(true))

    this.trigger = this.shadowRoot.querySelector('.dropdown-trigger')
    this.menu = this.shadowRoot.querySelector('.dropdown-menu')
    this.input = this.shadowRoot.querySelector('input[type="text"]')
    this.list = this.shadowRoot.querySelector('.dropdown-list')

    this.isOpen = false
    this.data = []
  }

  connectedCallback () {
    const apiUrl = this.getAttribute('api-url')
    if (apiUrl) {
      this.fetchData(apiUrl)
    }

    this.trigger.addEventListener('click', () => this.toggleMenu())
    this.input.addEventListener('input', () => this.filterOptions())
    document.addEventListener('click', (e) => this.handleOutsideClick(e))
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
  }

  disconnectedCallback () {
    this.trigger.removeEventListener('click', () => this.toggleMenu())
    this.input.removeEventListener('input', () => this.filterOptions())
    document.removeEventListener('click', (e) => this.handleOutsideClick(e))
    document.removeEventListener('keydown', this.handleKeyDown)
  }

  toggleMenu () {
    this.isOpen = !this.isOpen
    this.menu.classList.toggle('open', this.isOpen)
  }

  handleOutsideClick (e) {
    //   if (!this.shadowRoot.contains(e.target)) {
    //     this.isOpen = false;
    //     this.menu.classList.remove('open');
    //   }
  }

  handleKeyDown (event) {
    if (event.key === 'Escape' && this.isOpen) {
      this.isOpen = false
      this.menu.classList.remove('open')
      this.trigger.focus() // Refocus the trigger after closing
    }
  }

  async fetchData (apiUrl) {
    try {
      const response = await fetch(apiUrl)
      if (!response.ok) throw new Error('Network response was not ok')
      this.data = await response.json()
      console.log('this.data: ', this.data)

      this.populateList(this.data)
    } catch (error) {
      console.error('Error fetching data:', error)
      this.list.innerHTML = '<div class="dropdown-item">Error loading options</div>'
    }
  }

  populateList (data) {
    this.list.innerHTML = ''
    data.forEach((item) => {
      const div = document.createElement('div')
      div.className = 'dropdown-item'
      div.textContent = item.name
      div.dataset.value = item.id

      div.addEventListener('click', () => this.selectItem(item))
      this.list.appendChild(div)
    })
  }

  filterOptions () {
    const filterText = this.input.value.toLowerCase()

    const filteredData = this.data.filter((item) =>
      item.name.toLowerCase().includes(filterText)
    )

    this.populateList(filteredData)
  }

  selectItem (item) {
    this.selectecValue = item.id
    this.selectedName = item.name

    this.trigger.textContent = item.name
    this.isOpen = false
    this.menu.classList.remove('open')

    // Dispatch a custom event with the selected value
    this.dispatchEvent(
      new CustomEvent('dropdown-selected', {
        detail: { value: item.id, name: item.name },
        bubbles: true,
        composed: true
      })
    )
  }

  /** Getter to retrieve the counter value */
  get value () {
    return this.selectecValue || null
  }

  /** Setter to manually update the counter */
  set value (newValue) {
    if (!isNaN(newValue)) {
      const newName = this.data.filter((item) => item.id === newValue)[0].name

      this.selectItem({ id: newValue, name: newName })
    }
  }
}

customElements.define('select-element', SelectElement)
