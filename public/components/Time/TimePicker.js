export class TimePicker extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.selectedHour = null;
        this.selectedMinute = null;
        this.isPM = false;

        this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; font-family: inherit; font-size: inherit; }
        *, *::before, *::after { box-sizing: border-box; }

        .container {
          position: relative;
          display: inline-block;
        }

        input {
          width: 100%;
          padding: 0.375rem 0.75rem;
          border: 1px solid #ced4da;
          border-radius: 0.375rem;
          background: white;
          cursor: pointer;
        }

        .popup {
          position: absolute;
          top: 100%;
          left: 0;
          z-index: 1000;
          display: none;
          flex-direction: column;
          background: white;
          border: 1px solid #ddd;
          border-radius: 0.375rem;
          margin-top: 4px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          padding: 0.5rem;
          min-width: 180px;
        }

        .popup.open {
          display: flex;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          font-weight: bold;
        }

        .time-controls {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .adjust-btn {
          cursor: pointer;
          font-size: 1rem;
          padding: 0 0.3rem;
          user-select: none;
          border-radius: 0.25rem;
          border: 1px solid #ddd;
          background: #f8f9fa;
        }

        .adjust-btn:hover {
          background: #e9ecef;
        }

        .toggle {
          cursor: pointer;
          color: #007bff;
          font-size: 0.875rem;
          text-decoration: underline;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
        }

        .cell {
          text-align: center;
          padding: 0.25rem;
          cursor: pointer;
          border-radius: 0.25rem;
          border: 1px solid transparent;
        }

        .cell:hover {
          background: #f1f1f1;
          border-color: #ddd;
        }
      </style>

      <div class="container">
        <input type="text" readonly>
        <div class="popup">
          <div class="header">
            <div class="time-controls">
              <span class="adjust-btn" id="decrease">−</span>
              <span class="selected-time"></span>
              <span class="adjust-btn" id="increase">+</span>
            </div>
            <span class="toggle">AM</span>
          </div>
          <div class="grid"></div>
        </div>
      </div>
    `;
    }

    connectedCallback() {
        this._input = this.shadowRoot.querySelector('input');
        this._popup = this.shadowRoot.querySelector('.popup');
        this._grid = this.shadowRoot.querySelector('.grid');
        this._toggle = this.shadowRoot.querySelector('.toggle');
        this._selectedTime = this.shadowRoot.querySelector('.selected-time');
        this._increase = this.shadowRoot.querySelector('#increase');
        this._decrease = this.shadowRoot.querySelector('#decrease');

        this._input.addEventListener('click', () => this.togglePopup());
        this._toggle.addEventListener('click', () => this.toggleAmPm());
        this._increase.addEventListener('click', () => this.adjustMinutes(1));
        this._decrease.addEventListener('click', () => this.adjustMinutes(-1));

        this.renderHours();

        document.addEventListener('click', (e) => {
            if (!this.contains(e.target)) {
                this._popup.classList.remove('open');
            }
        });
    }

    togglePopup() {
        this._popup.classList.toggle('open');
        if (this.selectedHour === null) {
            this.renderHours();
        } else {
            this.renderMinutes();
        }
    }

    toggleAmPm() {
        this.isPM = !this.isPM;

        if (this.selectedHour !== null && this.selectedMinute !== null) {
            this.updateInput();
            this._popup.classList.remove('open');
        } else {
            this.updateHeader();
        }
    }

    renderHours() {
        this._grid.innerHTML = '';
        for (let i = 1; i <= 12; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = i;
            cell.addEventListener('click', () => {
                this.selectedHour = i;
                this.renderMinutes();
                this.updateHeader();
            });
            this._grid.appendChild(cell);
        }
        this.updateHeader();
    }

    renderMinutes() {
        this._grid.innerHTML = '';
        for (let i = 0; i < 60; i += 5) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = i.toString().padStart(2, '0');
            cell.addEventListener('click', () => {
                this.selectedMinute = i;
                this.updateInput();
                this._popup.classList.remove('open');
            });
            this._grid.appendChild(cell);
        }
        this.updateHeader();
    }

    updateHeader() {
        const hour = this.selectedHour ?? '--';
        const minute = this.selectedMinute !== null ? String(this.selectedMinute).padStart(2, '0') : '--';
        this._selectedTime.textContent = `${hour}:${minute} ${this.isPM ? 'PM' : 'AM'}`;
        this._toggle.textContent = this.isPM ? 'PM' : 'AM';
    }

    updateInput() {
        if (this.selectedHour !== null && this.selectedMinute !== null) {
            const hour24 = this.isPM
                ? (this.selectedHour % 12) + 12
                : (this.selectedHour % 12);
            const date = new Date();
            date.setHours(hour24, this.selectedMinute, 0, 0);

            this._input.value = date.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });

            this.updateHeader();
            this.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    adjustMinutes(delta) {
        if (this.selectedHour === null || this.selectedMinute === null) return;
        let newMinute = this.selectedMinute + delta;

        if (newMinute < 0) {
            newMinute = 59;
            this.selectedHour = this.selectedHour === 1 ? 12 : this.selectedHour - 1;
        }
        if (newMinute > 59) {
            newMinute = 0;
            this.selectedHour = this.selectedHour === 12 ? 1 : this.selectedHour + 1;
        }

        this.selectedMinute = newMinute;
        this.updateInput();
    }

    get value() {
        if (this.selectedHour === null || this.selectedMinute === null) return null;
        const hour24 = this.isPM
            ? (this.selectedHour % 12) + 12
            : (this.selectedHour % 12);
        return { hour: hour24, minute: this.selectedMinute };
    }
}

customElements.define('time-picker', TimePicker);

/* 
<time-picker id="tp"></time-picker>

<script>
  const tp = document.getElementById("tp");

  tp.timestamp = 4500; // 01:15 UTC, Jan 1 1970
  console.log("Time object:", tp.value);
  console.log("Unix timestamp:", tp.timestamp);
</script>
*/