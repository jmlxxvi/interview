import fs from 'node:fs'
import path from 'node:path'
// import config from '../../config.js'
import session from '../../platform/session.js'

import multer from 'multer'
import express from 'express'
import { timestamp, uuid } from '../../utils/index.js'
import log from '../../platform/log.js'

import { filesGetUploadDir, filesGetUploadPrefix } from './utils.js'

import { filesRepository } from '../../repositories/filesRepository.js'

export const router = express.Router()

const uploadDir = filesGetUploadDir()

const storage = multer.diskStorage({
  destination: function (_req, file, cb) {
    const prefix = filesGetUploadPrefix()
    const dir = `${uploadDir}/${prefix}`
    const extension = path.extname(file.originalname)
    file.extension = extension
    file.fileDir = prefix
    fs.mkdir(dir, { recursive: true }, (err) => {
      if (err) {
        return cb(err)
      }
      cb(null, dir)
    })
  },
  filename: function (_req, _file, cb) {
    cb(null, uuid())
  }
})

const upload = multer({ storage })

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const token = req.query.token
    const { userId, entityId } = await session.getAll(token)
    const info = req.file

    if (info) {
      const fileId = info.filename

      // Example extra fields
      // console.log(JSON.parse(req.body.tags)) // ["invoice", "2025", "pdf"]

      await filesRepository.saveFileInfo({
        fileId,
        fileName: info.originalname,
        mimeType: info.mimetype,
        fileDir: info.fileDir,
        fileSize: info.size,
        createdBy: userId,
        entityId,
        extension: info.extension,
        comments: req.body.comments || null
      })

      const response = {
        origin: 'upload',
        status: {
          error: false,
          code: 1000,
          timestamp: timestamp(true),
          elapsed: -1,
          request_id: uuid(),
          executor: res.locals.executor
        },
        data: {
          fileId,
          info
        }
      }

      res.json(response)
    } else {
      const response = {
        origin: 'upload',
        status: {
          error: true,
          code: 1000,
          messsage: 'File not sent',
          timestamp: timestamp(true),
          elapsed: -1,
          request_id: uuid(),
          executor: res.locals.executor
        },
        data: null
      }

      res.json(response)
    }
  } catch (error) {
    log.error(error, 'upload/upload')

    const response = {
      origin: 'upload',
      status: {
        error: true,
        code: 1000,
        message: error.message,
        timestamp: timestamp(true),
        elapsed: -1,
        request_id: uuid(),
        executor: res.locals.executor
      },
      data: null
    }

    res.json(response)
  }
})

router.get('/file/:file_id', async (req, res) => {
  try {
    const fileId = req.params.file_id
    const token = req.query.token
    const { userId, entityId } = await session.getAll(token)

    if (userId && entityId) {
      const fileData = await filesRepository.getFileById({}, entityId, fileId)

      console.log('fileData: ', fileData)
      if (fileData.isOk()) {
        const {
          fileName,
          mimeType,
          fileDir,
          fileSize
        } = fileData.value

        const filePath = `${filesGetUploadDir()}/${fileDir}/${fileId}`

        res.header('Content-Type', mimeType)
        res.header('Content-Disposition', `inline; filename="${fileName}"`)
        res.header('Content-Length', fileSize)
        res.sendFile(filePath)
      } else {
        res.send('File not found')
      }
    } else {
      res.send('Not authorized')
    }
  } catch (error) {
    log.error(error, 'upload/file')

    res.send('Error processing file')
  }
})
