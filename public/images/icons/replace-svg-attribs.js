import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get script directory (for ESM modules)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// === CONFIGURATION ===
const svgDir = path.join(__dirname, '.') // Folder containing your SVG files
const newFillValue = '#212529' // Desired fill color
const newWidth = '24' // Desired width (as string)
const newHeight = '24' // Desired height (as string)

// === PROCESS FILES ===
fs.readdir(svgDir, (err, files) => {
  if (err) {
    console.error('Failed to read directory:', err)
    return
  }

  files
    .filter(file => file.endsWith('.svg'))
    .forEach(file => {
      const filePath = path.join(svgDir, file)
      let content = fs.readFileSync(filePath, 'utf-8')

      // Replace fill
      content = content.replace(/fill="[^"]*"/g, `fill="${newFillValue}"`)

      // Replace width
      content = content.replace(/width="[^"]*"/g, `width="${newWidth}"`)

      // Replace height
      content = content.replace(/height="[^"]*"/g, `height="${newHeight}"`)

      fs.writeFileSync(filePath, content, 'utf-8')
      console.log(`Updated: ${file}`)
    })
})
