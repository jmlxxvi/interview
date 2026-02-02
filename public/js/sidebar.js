// Function to generate menu HTML
function generateMenu (menuItems, isSubmenu = false) {
  return menuItems.map(item => {
    const fullPath = item.path
    const hasSubmenu = item.items && item.items.length > 0

    // <img src="/images/icons/${isSubmenu ? 'dot.svg' : item.icon}" alt="${item.title}" class="menu-icon">
    // <img src="${isSubmenu ? '' : '/images/icons/' + item.icon}" alt="${item.title}" class="menu-icon">

    const imageIcon = isSubmenu ? '' : `<img src="/images/icons/${item.icon}" alt="${item.title}" class="menu-icon">`

    let menuItemHTML = `
                    <li class="menu-item ${hasSubmenu ? 'has-submenu' : ''}">
                        <a href="${hasSubmenu ? '#' : fullPath}" class="menu-link" ${hasSubmenu ? '' : 'router-link'}>
                            ${imageIcon}
                            <span class="menu-text ${isSubmenu ? 'submenutext' : ''}">${item.title}</span>
                `

    if (hasSubmenu) {
      menuItemHTML += `<svg class="menu-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>`
    }

    menuItemHTML += '</a>'

    if (hasSubmenu) {
      menuItemHTML += `
                        <ul class="submenu">
                            ${generateMenu(item.items, true)}
                        </ul>
                    `
    }

    menuItemHTML += '</li>'
    return '<ul>' + menuItemHTML + '</ul>'
  }).join('')
}

// Initialize the menu
export function initSidebarMenu (menuData) {
  const menuContainer = document.getElementsByClassName('sidebar-nav')
  console.log('menuContainer: ', menuContainer)
  //   menuContainer.innerHTML = generateMenu(menuData)
  const menuDataHtml = generateMenu(menuData)
  menuContainer[0].innerHTML = menuDataHtml

  // Add click event listeners for submenu toggling
  const menuItemsWithSubmenus = document.querySelectorAll('.menu-item.has-submenu')

  menuItemsWithSubmenus.forEach(item => {
    const menuLink = item.querySelector('.menu-link')

    menuLink.addEventListener('click', function (e) {
      e.preventDefault()

      // Close other open submenus
      menuItemsWithSubmenus.forEach(otherItem => {
        if (otherItem !== item && otherItem.classList.contains('open')) {
          otherItem.classList.remove('open')
        }
      })

      // Toggle current submenu
      item.classList.toggle('open')
    })
  })

  // Add active state to menu items
  const allMenuLinks = document.querySelectorAll('.menu-link, .submenu-link')

  allMenuLinks.forEach(link => {
    link.addEventListener('click', function () {
      // Remove active class from all links
      allMenuLinks.forEach(l => l.classList.remove('active'))

      // Add active class to clicked link
      this.classList.add('active')
    })
  })

  // Set dashboard as active by default
  const dashboardLink = document.querySelector('.menu-link[href="/dashboard"]')
  if (dashboardLink) {
    dashboardLink.classList.add('active')
  }
}
