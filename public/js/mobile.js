/**
 * Detects if the app is running on a mobile device.
 * Uses Client Hints API (if available), then viewport width, then UA fallback.
 *
 * @param {number} breakpoint - Max width (px) to treat as mobile (default 768px)
 * @returns {Promise<boolean>} - Resolves to true if mobile, false if desktop
 */
export async function mobileIsMobile (breakpoint = 768) {
  // 1. Try User-Agent Client Hints API (most reliable, privacy-friendly)
  if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
    try {
      const ua = await navigator.userAgentData.getHighEntropyValues(['mobile'])
      if (typeof ua.mobile === 'boolean') return ua.mobile
    } catch (err) {
      console.warn('Client Hints API failed, falling back to viewport/UA check', err)
    }
  }

  // 2. Fallback to viewport width check
  const isSmallScreen = window.innerWidth <= breakpoint
  if (isSmallScreen) return true

  // 3. Fallback to User Agent regex check
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

// Example usage
// (async () => {
//   const mobile = await mobileIsMobile()
//   console.log(mobile ? '📱 Mobile detected' : '💻 Desktop detected')
// })()
