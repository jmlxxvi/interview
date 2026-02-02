// class SimpleDropdown extends HTMLElement {
//   constructor () {
//     super()
//     this.attachShadow({ mode: 'open' })
//     this.isOpen = false
//     this.onClickOutside = this.handleClickOutside.bind(this)
//     this.onKeyDown = this.handleKeyDown.bind(this)
//     this.position = this.getAttribute('position') || 'left'
//     this._menuWidth = this.getAttribute('menu-width')
//   }

//   connectedCallback () {
//     this.render()
//     this.setupEventListeners()
//     if (this._menuWidth) {
//       this.updateMenuWidth(this._menuWidth)
//     }
//   }

//   disconnectedCallback () {
//     this.removeEventListeners()
//   }

//   render () {
//     this.shadowRoot.innerHTML = `
//                     <style>
//                         :host {
//                             display: inline-block;
//                             position: relative;
//                         }
//                         ::slotted([slot="toggle"]) {
//                             cursor: pointer;
//                             outline: none;
//                         }
//                         ::slotted(.dropdown-menu) {
//                             position: absolute;
//                             top: 100%;
//                             z-index: 1000;
//                             margin-top: 5px;
//                             width: var(--menu-width, auto);
//                             min-width: var(--menu-min-width, 150px);
//                         }
//                         ::slotted(.dropdown-item.disabled) {
//                             pointer-events: none;
//                         }
//                     </style>
//                     <slot name="toggle"></slot>
//                     <slot name="menu"></slot>
//                 `
//   }

//   setupEventListeners () {
//     const toggle = this.querySelector('[slot="toggle"]')
//     const menu = this.querySelector('[slot="menu"]')

//     if (toggle) {
//       toggle.addEventListener('click', (e) => this.toggleMenu(e))
//       toggle.addEventListener('click', (e) => e.preventDefault())
//     }

//     if (menu) {
//       menu.addEventListener('click', (e) => this.handleMenuItemClick(e))
//     }

//     document.addEventListener('click', this.onClickOutside)
//     document.addEventListener('keydown', this.onKeyDown)
//   }

//   removeEventListeners () {
//     const toggle = this.querySelector('[slot="toggle"]')
//     const menu = this.querySelector('[slot="menu"]')

//     if (toggle) {
//       toggle.removeEventListener('click', (e) => this.toggleMenu(e))
//     }

//     if (menu) {
//       menu.removeEventListener('click', (e) => this.handleMenuItemClick(e))
//     }

//     document.removeEventListener('click', this.onClickOutside)
//     document.removeEventListener('keydown', this.onKeyDown)
//   }

//   closeOtherDropdowns () {
//     document.querySelectorAll('app-dropdown').forEach(dropdown => {
//       if (dropdown !== this && dropdown.isOpen) {
//         dropdown.closeMenu()
//       }
//     })
//   }

//   toggleMenu (e) {
//     if (e) {
//       e.stopPropagation()
//     }

//     // Close other dropdowns when opening this one
//     if (!this.isOpen) {
//       this.closeOtherDropdowns()
//     }

//     this.isOpen ? this.closeMenu() : this.openMenu()
//   }

//   openMenu () {
//     const menu = this.querySelector('[slot="menu"]')
//     if (menu) {
//       menu.classList.add('show')
//       this.isOpen = true
//       this.positionMenu()
//     }
//   }

//   closeMenu () {
//     const menu = this.querySelector('[slot="menu"]')
//     if (menu) {
//       menu.classList.remove('show')
//       this.isOpen = false
//     }
//   }

//   positionMenu () {
//     const menu = this.querySelector('[slot="menu"]')
//     if (!menu) return

//     menu.style.left = ''
//     menu.style.right = ''

//     if (this.position === 'right') {
//       menu.style.right = '0'
//     } else {
//       menu.style.left = '0'
//     }

//     this.adjustForViewport()
//   }

//   adjustForViewport () {
//     const menu = this.querySelector('[slot="menu"]')
//     if (!menu) return

//     const menuRect = menu.getBoundingClientRect()
//     const viewportWidth = window.innerWidth

//     if (menuRect.right > viewportWidth) {
//       menu.style.right = '0'
//       menu.style.left = 'auto'
//     } else if (menuRect.left < 0) {
//       menu.style.left = '0'
//       menu.style.right = 'auto'
//     }
//   }

//   handleClickOutside (e) {
//     if (!this.contains(e.target) && this.isOpen) {
//       this.closeMenu()
//     }
//   }

//   handleKeyDown (e) {
//     if (e.key === 'Escape' && this.isOpen) {
//       this.closeMenu()
//     }
//   }

//   handleMenuItemClick (e) {
//     const item = e.target.closest('.dropdown-item')
//     if (item) {
//       // Check if item is disabled
//       if (item.classList.contains('disabled')) {
//         e.preventDefault()
//         e.stopPropagation()
//         // updateStatus(`Clicked disabled item: "${item.textContent}" - no action taken`)
//         return
//       }

//       // Item is enabled, handle the click
//       // updateStatus(`Clicked enabled item: "${item.textContent}"`)
//       console.log('Selected:', item.textContent)
//       this.closeMenu()
//     }
//   }

//   // Method to enable/disable specific items
//   setItemDisabled (index, disabled) {
//     const menu = this.querySelector('[slot="menu"]')
//     if (!menu) return

//     const items = menu.querySelectorAll('.dropdown-item')
//     if (index >= 0 && index < items.length) {
//       if (disabled) {
//         items[index].classList.add('disabled')
//       } else {
//         items[index].classList.remove('disabled')
//       }
//     }
//   }

//   // Method to enable/disable all items
//   setAllItemsDisabled (disabled) {
//     const menu = this.querySelector('[slot="menu"]')
//     if (!menu) return

//     const items = menu.querySelectorAll('.dropdown-item')
//     items.forEach(item => {
//       if (disabled) {
//         item.classList.add('disabled')
//       } else {
//         item.classList.remove('disabled')
//       }
//     })
//   }

//   static get observedAttributes () {
//     return ['position', 'menu-width']
//   }

//   attributeChangedCallback (name, oldValue, newValue) {
//     if (name === 'position' && oldValue !== newValue) {
//       this.position = newValue || 'left'
//       if (this.isOpen) {
//         this.positionMenu()
//       }
//     } else if (name === 'menu-width' && oldValue !== newValue) {
//       this.updateMenuWidth(newValue)
//     }
//   }

//   updateMenuWidth (width) {
//     const menu = this.querySelector('[slot="menu"]')
//     if (menu) {
//       if (width) {
//         menu.style.setProperty('--menu-width', width)
//       } else {
//         menu.style.removeProperty('--menu-width')
//       }
//     }
//   }

//   get position () {
//     return this._position
//   }

//   set position (value) {
//     this._position = value
//     this.setAttribute('position', value)
//   }
// }

// customElements.define('app-dropdown', SimpleDropdown)
class SimpleDropdown extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.isOpen = false

    // Store bound event handlers for correct removal
    this.onClickOutside = this.handleClickOutside.bind(this)
    this.onKeyDown = this.handleKeyDown.bind(this)
    this.toggleHandler = this.toggleMenu.bind(this)
    this.menuClickHandler = this.handleMenuItemClick.bind(this)

    this.position = this.getAttribute('position') || 'left'
    this._menuWidth = this.getAttribute('menu-width')
  }

  connectedCallback () {
    this.render()
    this.setupEventListeners()
    if (this._menuWidth) {
      this.updateMenuWidth(this._menuWidth)
    }
  }

  disconnectedCallback () {
    this.removeEventListeners()
  }

  render () {
    this.shadowRoot.innerHTML = `
                    <style>
                        :host {
                            display: inline-block;
                            position: relative;
                        }
                        ::slotted([slot="toggle"]) {
                            cursor: pointer;
                            outline: none;
                        }
                        /* Base position: opens down */
                        ::slotted(.dropdown-menu) {
                            position: absolute;
                            visibility: hidden; /* Hide menu initially to prevent flash */
                            opacity: 0;
                            transition: opacity 0.1s ease;

                            top: 100%; 
                            z-index: 1000;
                            margin-top: 5px;
                            margin-bottom: 0;
                            width: var(--menu-width, auto);
                            min-width: var(--menu-min-width, 150px);
                        }
                        /* Menu becomes visible and opaque when shown */
                        ::slotted(.dropdown-menu.show) {
                            visibility: visible;
                            opacity: 1;
                        }

                        /* Upward positioning */
                        ::slotted(.dropdown-menu.open-up) {
                            top: auto;
                            bottom: 100%; /* Positions the menu above the toggle */
                        }
                        ::slotted(.dropdown-item.disabled) {
                            pointer-events: none;
                        }
                    </style>
                    <slot name="toggle"></slot>
                    <slot name="menu"></slot>
                `
  }

  setupEventListeners () {
    const toggle = this.querySelector('[slot="toggle"]')
    const menu = this.querySelector('[slot="menu"]')

    if (toggle) {
      toggle.addEventListener('click', this.toggleHandler)
      toggle.addEventListener('click', (e) => e.preventDefault()) // Prevent default for the toggle
    }

    if (menu) {
      menu.addEventListener('click', this.menuClickHandler)
    }

    document.addEventListener('click', this.onClickOutside)
    document.addEventListener('keydown', this.onKeyDown)
  }

  removeEventListeners () {
    const toggle = this.querySelector('[slot="toggle"]')
    const menu = this.querySelector('[slot="menu"]')

    // Use the stored bound functions for removal
    if (toggle) {
      toggle.removeEventListener('click', this.toggleHandler)
    }

    if (menu) {
      menu.removeEventListener('click', this.menuClickHandler)
    }

    document.removeEventListener('click', this.onClickOutside)
    document.removeEventListener('keydown', this.onKeyDown)
  }

  closeOtherDropdowns () {
    document.querySelectorAll('app-dropdown').forEach(dropdown => {
      if (dropdown !== this && dropdown.isOpen) {
        dropdown.closeMenu()
      }
    })
  }

  toggleMenu (e) {
    if (e) {
      e.stopPropagation()
    }

    if (!this.isOpen) {
      this.closeOtherDropdowns()
    }

    this.isOpen ? this.closeMenu() : this.openMenu()
  }

  openMenu () {
    const menu = this.querySelector('[slot="menu"]')
    if (menu) {
      this.isOpen = true
      this.style.border = '1px solid var(--gray-300, transparent)'
      this.positionMenu()
    }
  }

  closeMenu () {
    const menu = this.querySelector('[slot="menu"]')
    if (menu) {
      menu.classList.remove('show')
      menu.classList.remove('open-up')
      this.isOpen = false
      this.style.border = '1px solid transparent'
    }
  }

  positionMenu () {
    const menu = this.querySelector('[slot="menu"]')
    if (!menu) return

    // 1. Set initial horizontal position (default to down)
    menu.style.left = ''
    menu.style.right = ''
    menu.classList.remove('open-up') // Start in default (down) position

    if (this.position === 'right') {
      menu.style.right = '0'
    } else {
      menu.style.left = '0'
    }

    // 2. Perform viewport adjustments (vertical and horizontal)
    this.adjustForViewport()
  }

  getDimensionsOfHiddenElement (element) {
  // 1. Store the original state and prepare temporary styles
    const originalDisplay = element.style.display
    const originalPosition = element.style.position
    const originalVisibility = element.style.visibility

    // 2. Temporarily change styles to allow measurement without visual impact
    element.style.visibility = 'hidden' // Hide visually
    element.style.position = 'absolute' // Prevent it from affecting current layout flow
    element.style.display = 'block' // Allow the browser to calculate size

    // 3. Measure the element
    const width = element.offsetWidth
    const height = element.offsetHeight

    // 4. Restore the original styles
    element.style.display = originalDisplay
    element.style.position = originalPosition
    element.style.visibility = originalVisibility

    // 5. Return the dimensions
    return { width, height }
  }

  adjustForViewport () {
    const menu = this.querySelector('[slot="menu"]')
    if (!menu || !this.isOpen) return

    const { height } = this.getDimensionsOfHiddenElement(menu)

    const hostRect = this.getBoundingClientRect()
    const viewportHeight = window.innerHeight

    const MENU_MARGIN = 64 // Margin to keep from viewport edges

    // // Vertical Checks
    const spaceBelow = viewportHeight - hostRect.bottom
    const spaceAbove = hostRect.top
    const requiredHeight = height + MENU_MARGIN

    // Logic: Flip UP only if there's insufficient space below AND sufficient space above.
    if (spaceBelow < requiredHeight && spaceAbove >= requiredHeight) {
      menu.classList.add('open-up')
    } else {
      // If enough space is below, or insufficient space in both directions, default to opening down.
      menu.classList.remove('open-up')
    }

    // Horizontal Checks (Adjust after vertical flip)
    const viewportWidth = window.innerWidth
    const finalMenuRect = menu.getBoundingClientRect()

    if (finalMenuRect.right > viewportWidth) {
      // Menu goes off the right edge, pin it to the right
      menu.style.right = '0'
      menu.style.left = 'auto'
    } else if (finalMenuRect.left < 0) {
      // Menu goes off the left edge, pin it to the left
      menu.style.left = '0'
      menu.style.right = 'auto'
    }

    menu.classList.add('show')
  }

  handleClickOutside (e) {
    // Check if the click target is outside the dropdown component itself, handling Shadow DOM with composedPath
    if (!e.composedPath().includes(this) && this.isOpen) {
      this.closeMenu()
    }
  }

  handleKeyDown (e) {
    if (e.key === 'Escape' && this.isOpen) {
      this.closeMenu()
    }
  }

  handleMenuItemClick (e) {
    const item = e.target.closest('.dropdown-item')
    if (item) {
      if (item.classList.contains('disabled')) {
        e.preventDefault()
        e.stopPropagation()
        return
      }

      console.log('Selected:', item.textContent)
      this.closeMenu()
    }
  }

  // Method to enable/disable specific items
  setItemDisabled (index, disabled) {
    const menu = this.querySelector('[slot="menu"]')
    if (!menu) return

    const items = menu.querySelectorAll('.dropdown-item')
    if (index >= 0 && index < items.length) {
      if (disabled) {
        items[index].classList.add('disabled')
      } else {
        items[index].classList.remove('disabled')
      }
    }
  }

  // Method to enable/disable all items
  setAllItemsDisabled (disabled) {
    const menu = this.querySelector('[slot="menu"]')
    if (!menu) return

    const items = menu.querySelectorAll('.dropdown-item')
    items.forEach(item => {
      if (disabled) {
        item.classList.add('disabled')
      } else {
        item.classList.remove('disabled')
      }
    })
  }

  static get observedAttributes () {
    return ['position', 'menu-width']
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'position' && oldValue !== newValue) {
      this.position = newValue || 'left'
      if (this.isOpen) {
        this.positionMenu()
      }
    } else if (name === 'menu-width' && oldValue !== newValue) {
      this.updateMenuWidth(newValue)
    }
  }

  updateMenuWidth (width) {
    const menu = this.querySelector('[slot="menu"]')
    if (menu) {
      if (width) {
        menu.style.setProperty('--menu-width', width)
      } else {
        menu.style.removeProperty('--menu-width')
      }
    }
  }

  get position () {
    return this._position
  }

  set position (value) {
    this._position = value
    this.setAttribute('position', value)
  }
}

customElements.define('app-dropdown', SimpleDropdown)
