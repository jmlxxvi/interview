import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'
// import { promisify } from 'util'

export class GoogleDriveProcessor {
  constructor () {
    this.auth = null
    this.drive = null
    this.sourceFolderId = 'your-source-folder-id' // Replace with your source folder ID
    this.destinationFolderId = 'your-destination-folder-id' // Replace with your destination folder ID
  }

  async initialize () {
    try {
      // Authenticate with Google Drive API
      this.auth = new google.auth.GoogleAuth({
        keyFile: 'service-account-key.json',
        scopes: ['https://www.googleapis.com/auth/drive']
      })

      this.drive = google.drive({ version: 'v3', auth: this.auth })
      console.log('Google Drive API initialized successfully')
    } catch (error) {
      console.error('Error initializing Google Drive API:', error)
      throw error
    }
  }

  // Regex pattern to match files with YYYYMMDD date in filename
  getDatePattern () {
    return /\d{8}/ // Matches exactly 8 digits (YYYYMMDD)
  }

  async listFilesInFolder (folderId) {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType)'
      })

      return response.data.files
    } catch (error) {
      console.error('Error listing files:', error)
      throw error
    }
  }

  async downloadFile (fileId, fileName) {
    try {
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      )

      const tempDir = './temp'
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir)
      }

      const filePath = path.join(tempDir, fileName)
      const dest = fs.createWriteStream(filePath)

      return new Promise((resolve, reject) => {
        response.data
          .on('end', () => resolve(filePath))
          .on('error', reject)
          .pipe(dest)
      })
    } catch (error) {
      console.error('Error downloading file:', error)
      throw error
    }
  }

  async processFile (filePath, fileName) {
    try {
      // Read file content
      const content = fs.readFileSync(filePath, 'utf8')

      // Extract date from filename
      const dateMatch = fileName.match(this.getDatePattern())
      const fileDate = dateMatch ? dateMatch[0] : 'unknown_date'

      // Your custom processing logic here
      console.log(`Processing file: ${fileName} with date: ${fileDate}`)

      // Example processing: convert to uppercase and add timestamp
      const processedContent = content.toUpperCase() +
        `\n\nProcessed on: ${new Date().toISOString()}` +
        `\nOriginal file date: ${fileDate}`

      return {
        content: processedContent,
        processedFileName: `processed_${fileName}`
      }
    } catch (error) {
      console.error('Error processing file:', error)
      throw error
    }
  }

  async uploadFile (fileName, content, folderId) {
    try {
      const fileMetadata = {
        name: fileName,
        parents: [folderId]
      }

      const media = {
        mimeType: 'text/plain',
        body: content
      }

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id'
      })

      console.log(`File uploaded successfully: ${response.data.id}`)
      return response.data.id
    } catch (error) {
      console.error('Error uploading file:', error)
      throw error
    }
  }

  async deleteFile (fileId) {
    try {
      await this.drive.files.delete({
        fileId
      })
      console.log(`File deleted successfully: ${fileId}`)
    } catch (error) {
      console.error('Error deleting file:', error)
      throw error
    }
  }

  async cleanupTempFile (filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log(`Temporary file cleaned up: ${filePath}`)
      }
    } catch (error) {
      console.error('Error cleaning up temp file:', error)
    }
  }

  async processFiles () {
    try {
      console.log('Starting file processing...')

      // Get all files in source folder
      const files = await this.listFilesInFolder(this.sourceFolderId)
      console.log(`Found ${files.length} files to process`)

      for (const file of files) {
        try {
          // Check if file is text file and has date in name
          if (file.mimeType === 'text/plain' && this.getDatePattern().test(file.name)) {
            console.log(`Processing file: ${file.name}`)

            // Download file
            const localFilePath = await this.downloadFile(file.id, file.name)

            // Process file content
            const processedData = await this.processFile(localFilePath, file.name)

            // Upload processed file to destination folder
            await this.uploadFile(
              processedData.processedFileName,
              processedData.content,
              this.destinationFolderId
            )

            // Delete original file from source folder
            await this.deleteFile(file.id)

            // Clean up temporary file
            await this.cleanupTempFile(localFilePath)

            console.log(`Successfully processed: ${file.name}`)
          } else {
            console.log(`Skipping file (not text or no date in name): ${file.name}`)
          }
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError)
          // Continue with next file even if one fails
        }
      }

      console.log('File processing completed')
    } catch (error) {
      console.error('Error in main processing:', error)
      throw error
    }
  }
}

// Usage
// async function main () {
//   const processor = new GoogleDriveProcessor()

//   try {
//     await processor.initialize()
//     await processor.processFiles()
//   } catch (error) {
//     console.error('Application error:', error)
//     process.exit(1)
//   }
// }

// Run the application
// main()

// Optional: Run on a schedule (e.g., every hour)
// setInterval(main, 60 * 60 * 1000);
