class CollapsibleElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          overflow: hidden;
          font-family: sans-serif;
          color: var(--gray-900);
        }

        .header {
          background: var(--gray-100);
          padding: 0.75rem 1rem;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: bold;
          user-select: none;
        }

        .icon {
          transition: transform 0.3s ease;
        }

        .icon.open {
          transform: rotate(90deg);
        }

        .content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }

        .content.open {
          max-height: 300px; /* big enough to fit most content */
        }

        ::slotted(*) {
          display: block;
          padding: 1rem !important;
        }
      </style>

      <div class="header">
        <span class="label"></span>
        <img class="icon" src="/images/icons/chevron-right.svg" alt="Expand/Collapse" width="16" height="16" />
      </div>
      <div class="content">
        <slot></slot>
      </div>
    `;
  }

  connectedCallback() {
    this.labelElement = this.shadowRoot.querySelector(".label");
    this.iconElement = this.shadowRoot.querySelector(".icon");
    this.contentElement = this.shadowRoot.querySelector(".content");

    this.labelElement.textContent = this.getAttribute("label") || "Details";

    // If `start-open` attribute is present, open on load
    if (this.hasAttribute("start-open")) {
      this.contentElement.classList.add("open");
      this.iconElement.classList.add("open");
    }

    this.shadowRoot.querySelector(".header").addEventListener("click", () =>
      this.toggle()
    );
  }

  toggle() {
    const isOpen = this.contentElement.classList.toggle("open");
    this.iconElement.classList.toggle("open", isOpen);
  }
}

customElements.define("collapsible-box", CollapsibleElement);

/*

<collapsible-box label="Expanded by Default" start-open>
  <p>This section is open when the page loads.</p>
</collapsible-box>

<collapsible-box label="Collapsed by Default">
  <p>This section starts closed until clicked.</p>
</collapsible-box>

*/
