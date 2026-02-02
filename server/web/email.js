import express from 'express'

export const router = express.Router()

/**
 * Route: Open tracking
 */
router.get('/email/track/open/:emailId', (req, res) => {
  const { emailId } = req.params

  // Log or save to DB
  console.log(`📩 Email ${emailId} opened at ${new Date().toISOString()}`, {
    ip: req.ip,
    ua: req.headers['user-agent']
  })

  // Return a 1x1 transparent GIF
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  )

  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0'
  })

  res.end(pixel)
})

/**
   * Route: Click tracking
   */
router.get('/email/track/click/:emailId/:linkId', (req, res) => {
  const { emailId, linkId } = req.params

  // Example link map (use DB in production)
  const links = {
    offer123: 'https://example.com/some-offer',
    docs456: 'https://example.com/docs'
  }

  const targetUrl = links[linkId]

  if (!targetUrl) {
    return res.status(404).send('Invalid link')
  }

  // Log or save to DB
  console.log(`🔗 Email ${emailId} clicked ${linkId} at ${new Date().toISOString()}`, {
    ip: req.ip,
    ua: req.headers['user-agent']
  })

  // Redirect to real link
  res.redirect(targetUrl)
})
