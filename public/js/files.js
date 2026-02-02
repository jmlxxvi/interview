import config from './config.js'

// import { getAccessToken } from "./backend.js";

export async function filesInit () {
  document.addEventListener('click', (event) => {
    const element = event.target.closest('.files-open-file')

    if (element) {
      event.preventDefault()

      // const token = backendGetToken()

      // add a attribute data-fileid with the UUID of the file
      const fileId = element.dataset.fileid

      window.open(`${config.CONFIG_BACKEND_URL}/file/${fileId}`, '_blank', 'noopener,noreferrer')
    }
  })
}

export function filesUpload ($file, onLoaded, onProgress, comments) {
  console.log('comments: ', comments)
  const logContext = 'UTILS:UPLOAD'

  // const token = backendGetToken()

  const file = $file.name

  function execOnLoad (error, response) {
    if (typeof onLoaded === 'function') {
      onLoaded(error, file, response)
    }
  }

  try {
    console.log(`Uploading file "${file}"`, logContext)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${config.CONFIG_BACKEND_URL}/upload`)

    // file uploading progress event
    xhr.upload.onprogress = ({ loaded, total }) => {
      if (typeof onProgress === 'function') {
        onProgress(loaded, total, file)
      }
    }

    const formData = new FormData()

    formData.append('file', $file)

    if (comments) {
      formData.append('comments', comments)
    }

    // Example extra fields
    // formData.append('tags', JSON.stringify(['invoice', '2025', 'pdf']));

    xhr.send(formData) // sending form data

    xhr.onload = function () {
      // console.console.log('upload complete');
      if (xhr.status === 200) {
        execOnLoad(false, JSON.parse(xhr.responseText)) // TODO: check if this is valid JSON
      } else {
        // execOnLoad(true, JSON.parse(xhr.responseText));
        execOnLoad(true, xhr.statusText)
      }
    }
  } catch (error) {
    execOnLoad(true, error.message)
  }
}
