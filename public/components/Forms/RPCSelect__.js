import { backendRpc } from '../../js/backend.js'

/*
<forms-rpc-select id="countries" mod="auth/users" fun="lookup"></forms-rpc-select>

<script>
  const select = document.getElementById("countries");

  // Wait a bit until options load
  setTimeout(() => {
    console.log("Value:", select.value); // e.g. "option1"
    console.log("Text:", select.text);   // e.g. "Option 1"

    // Set selection programmatically
    select.value = "option2";
    console.log("Now selected:", select.value, select.text);
  }, 1000);
</script>

---

<forms-rpc-select id="countries" mod="auth/users" fun="lookup"></forms-rpc-select>

<script>
  const select = document.getElementById("countries");

  select.addEventListener("change", () => {
    console.log("Changed:", select.value, select.text);
  });

  // Programmatic change also triggers the event
  setTimeout(() => {
    select.value = "option2";
  }, 2000);
</script>

---

<!-- Override with external CSS -->
<style>
  forms-rpc-select.custom-size {
    width: 150px;
  }
</style>
<forms-rpc-select class="custom-size" mod="auth/users" fun="lookup"></forms-rpc-select>

*/
class FormsRPCSelect extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = `
        :host {
          display: block;       /* expand like a block element */
          width: 100%;          /* take full width of parent */
        }
  
        select {
          width: 100%;          /* select expands to fill host */
          border-color:  var(--border-color);
          border-radius: var(--border-radius);
          padding: .75rem .75rem;
          outline: none;
          background-color: white;
          box-sizing: border-box; /* includes padding in width */
        }
  

      `

    this.select = document.createElement('select')

    this.shadowRoot.append(style, this.select)

    // Re-dispatch change event from <select> → <backend-select>
    this.select.addEventListener('change', () => {
      this.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }

  //

  async connectedCallback () {
    const mod = this.getAttribute('mod')
    if (!mod) {
      console.error("FormsRPCSelect: Missing 'mod' attribute")
      return
    }

    const fun = this.getAttribute('fun')
    if (!fun) {
      console.error("FormsRPCSelect: Missing 'fun' attribute")
      return
    }

    const args = this.getAttribute('args')

    // Example backend call – adjust URL as needed
    const response = await backendRpc(mod, fun, args)

    if (response.status.error) {
      console.error(response.status.message)
    } else {
      this.populateOptions(response.data)
    }
  }

  populateOptions (data) {
    console.log('data: ', data)
    this.select.innerHTML = '' // clear old options

    if (this.getAttribute('empty-value') || this.getAttribute('empty-text')) {
      const option = document.createElement('option')
      option.value = this.getAttribute('empty-value') || ''
      option.textContent = this.getAttribute('empty-text') || 'Seleccione...'
      this.select.appendChild(option)
    }

    data.forEach(item => {
      const option = document.createElement('option')
      option.value = item.key
      option.textContent = item.value
      this.select.appendChild(option)
    })
  }

  // --- API methods ---

  /** Get selected value (backend key) */
  get value () {
    return this.select.value
  }

  /** Set selected value programmatically */
  set value (val) {
    this.select.value = val
  }

  /** Get selected text (backend label) */
  get text () {
    const opt = this.select.options[this.select.selectedIndex]
    return opt ? opt.textContent : null
  }
}

customElements.define('forms-rpc-select', FormsRPCSelect)
