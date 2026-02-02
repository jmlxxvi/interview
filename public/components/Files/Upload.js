// import { $ } from '../../js/dom.js'
import { createModal } from '../Modal/Modal.js'
import { filesUpload } from '../../js/files.js'
import { $ } from '../../js/dom.js'
import { securitySafeHtml } from '../../js/security.js'
import { suid } from '../../js/utils.js'

export function FileUpload ({
  title,
  onUpload = null,
  onClose = null
}) {
  let fileId = null
  let fileName = null
  let extra = null
  // create html structure

  const id = suid()

  const html = `
        <div class="modal-backdrop"></div>
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="component_upload_title_${id}">Subir archivo</h5>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <button class="button link" id="component_upload_select_button_${id}">Seleccionar archivo</button>
                        <input class="form-control" type="file" id="component_upload_input_${id}" style="display: none;">
                    </div>
                      <!-- Text to show file name -->
                    <span id="component_upload_filename_${id}" class="text-muted"></span>
                    <div class="my-3">
                        <label for="component_upload_comment_${id}" class="form-label">Comentario</label>
                        <input class="form-control" type="text" id="component_upload_comment_${id}">
                    </div>
                  <progress-bar id="component_upload_progress_${id}" value="0"></progress-bar>

                </div>
                <div class="modal-footer">
                    <img src="/images/icons/delete.svg" class="image-button cursor-pointer" id="component_upload_close_button_${id}" />
                    <img src="/images/icons/upload.svg" class="image-button cursor-pointer" id="component_upload_upload_button_${id}" />
                </div>
            </div>
        </div>
    `

  const wrapper = document.createElement('div')
  wrapper.className = 'modal'
  wrapper.innerHTML = html

  // <button class="btn-close" data-dismiss="modal" aria-label="Close">×</button>

  document.body.appendChild(wrapper)
  const modal = createModal(wrapper)

  // ---------------------

  if (title) {
    $(`#component_upload_title_${id}`).innerHTML = securitySafeHtml(title)
  }

  function open (ex) {
    $(`#component_upload_input_${id}`).value = ''
    $(`#component_upload_comment_${id}`).value = ''
    $(`#component_upload_progress_${id}`).setAttribute('value', 0)
    $(`#component_upload_title_${id}`).innerHTML = securitySafeHtml(title || 'Subir archivo')
    $(`#component_upload_filename_${id}`).textContent = 'Ningún archivo seleccionado'

    fileId = null
    fileName = null
    extra = ex || null

    modal.show()
  }
  function close () {
    modal.hide()
    if (typeof onClose === 'function') {
      onClose(fileId)
    }
  }

  function showError (message) {
    $(`#component_upload_title_${id}`).innerHTML = `<span style="color: var(--danger);">${securitySafeHtml(message)}</span>`
  }

  $(`#component_upload_input_${id}`).addEventListener('change', () => {
    if ($(`#component_upload_input_${id}`).files.length > 0) {
      $(`#component_upload_filename_${id}`).textContent = $(`#component_upload_input_${id}`).files[0].name
    } else {
      $(`#component_upload_filename_${id}`).textContent = 'Ningún archivo seleccionado'
    }
  })

  document.body.addEventListener('click', (event) => {
    if (event.target.id === `component_upload_select_button_${id}`) {
      event.preventDefault()
      $(`#component_upload_input_${id}`).click()
    }

    if (event.target.id === `component_upload_upload_button_${id}`) {
      event.preventDefault()

      const inputFile = document.getElementById(`component_upload_input_${id}`)
      if (!inputFile || !inputFile.files || inputFile.files.length === 0) {
        showError('Seleccione un archivo')
        return
      }
      console.log('inputFile.files: ', inputFile.files)
      const fileToUpload = inputFile.files[0]

      filesUpload(
        fileToUpload,
        async (error, _file, response) => {
          console.log('response: filesUpload ', response)
          if (error) {
            showError(response.status.message)
          } else {
            fileId = response.data?.fileId
            fileName = response.data?.info.originalName || ''

            if (typeof onUpload === 'function') {
              const error = await onUpload(fileId, response.data, extra)
              if (error) {
                showError(error)
              } else {
                close()
              }
            } else {
              close()
            }
          }
        },
        (loaded, total, _file) => {
          const percent = Math.round((loaded / total) * 100)
          document.getElementById(`component_upload_progress_${id}`).setAttribute('value', percent)
        },
        $(`#component_upload_comment_${id}`).value
      )
    }

    if (event.target.id === `component_upload_close_button_${id}`) {
      event.preventDefault()

      //   modal.hide()
      if (typeof onClose === 'function') {
        onClose(fileId)
      }

      close()
    }
  })

  return {
    modal,
    open,
    close,
    getFileId: () => fileId,
    getFileName: () => fileName,
    setFileId: (newFileId) => { fileId = newFileId },
    setFileName: (newFileName) => { fileName = newFileName },
    getExtra: () => extra,
    setExtra: (newExtra) => { extra = newExtra }
  }
}
