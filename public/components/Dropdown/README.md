
## Examples

```html
<app-dropdown>
    <button slot="toggle" class="dots-button" aria-label="More options">
        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="#333">
            <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z"/>
        </svg>
    </button>
    <div slot="menu" class="dropdown-menu">
        <a class="dropdown-item" href="#edit">Edit</a>
        <a class="dropdown-item" href="#copy">Copy</a>
        <a class="dropdown-item" href="#share">Share</a>
        <a class="dropdown-item" href="#delete">Delete</a>
    </div>
</app-dropdown>

<app-dropdown position="right">
    <button slot="toggle" class="dots-button" aria-label="More options">
        <img src="/images/icons/three-dots-vertical.svg" alt="More options">
    </button>
    <div slot="menu" class="dropdown-menu">
        <a href="#" class="dropdown-item exewordet__workorder_cancel" data-workorder-id="${batch.id}">Cancel Batch</a>
    </div>
</app-dropdown>

<app-dropdown position="right">
    <a href="#" slot="toggle" class="text-link">Actions</a>
    <div slot="menu" class="dropdown-menu">
        <a class="dropdown-item" href="#edit">Edit</a>
        <a class="dropdown-item" href="#copy">Copy</a>
        <a class="dropdown-item" href="#share">Share</a>
        <a class="dropdown-item" href="#delete">Delete</a>
    </div>
</app-dropdown>
```