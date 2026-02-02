// Event delegation for tab clicks
document.addEventListener('click', function (e) {
  // Check if clicked element is a tab header
  // if (e.target.classList.contains('tab-header')) {
  const tabHeader = e.target.closest('.tab-header')
  if (tabHeader && !tabHeader.hasAttribute('disabled')) {
    const tabId = tabHeader.getAttribute('data-tab')
    switchTab(tabId)
  }
})

function switchTab (tabId) {
  console.log('tabId: ', tabId)
  // Remove active class from all tab headers
  document.querySelectorAll('.tab-header').forEach(header => {
    header.classList.remove('active')
  })

  // Hide all tab panes
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active')
  })

  // Activate clicked tab header
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active')

  // Show corresponding tab pane
  document.getElementById(tabId).classList.add('active')
}
