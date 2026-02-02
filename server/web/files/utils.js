import fs from 'node:fs'
import path from 'node:path'

import config from '../../config.js'

import { filesRepository } from '../../repositories/filesRepository.js'

export async function filesGetFilePath (entityId, fileId, checkFileExists = true) {
  const fileData = await filesRepository.getFileById(null, entityId, fileId)
  console.log('fileData: ', fileData)

  if (fileData.isError() || !fileData.value.id) {
    throw new Error('File not found')
  }

  const { fileDir } = fileData.value

  const uploadDir = filesGetUploadDir()

  const filePath = path.join(uploadDir, fileDir, fileId)

  if (checkFileExists) {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK)
    } catch (error) {
      throw new Error('File not found')
    }
  }

  return filePath
}

export function filesGetUploadDir () {
  const uploadDir = `${config.storage.base_dir}/uploads`

  return uploadDir
}

export function filesGetUploadPrefix () {
  const stringYYYYMMDD = new Date().toISOString().slice(0, 10).replace(/-/g, '/')

  return stringYYYYMMDD
}
