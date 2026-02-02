import { $ } from '../../../js/dom.js'
import { securitySafeHtml } from '../../../js/security.js'
import { uuid } from '../../../js/utils.js'
import { backendRpc } from '../../../js/backend.js'
import { i18nUnixToDate } from '../../../js/i18n.js'

export function DocumentFilesTable ({
  targetElement,
  rpc,
  onDelete = null,
  loadOnAttach = true
}) {
  const id = uuid()

  let localData = []

  const eventTarget = new EventTarget() // 👈 creates an event dispatcher object

  if (!(targetElement instanceof HTMLElement)) {
    targetElement = $(targetElement)
  }

  async function buildDocsTable () {
    try {
      targetElement.innerHTML = ''

      const response = await backendRpc(rpc.mod, rpc.fun, rpc.args || {})

      if (response.status.error) {
        targetElement.innerHTML = `<p class="text-danger">Error: ${response.status.message}</p>`
        return
      }

      localData = response.data || []

      let html = `
        <div class="mb-3" id="components_fiscoman_filestable_container_${id}">
        <table class="table w-100 border">
            <thead>
                <tr>
                    <th style="text-align: left;">Archivo</th>
                    <th style="text-align: left;">Comentarios</th>
                    <th>Subido por</th>
                    <th>&nbsp;</th>
                    <th>&nbsp;</th>
                </tr>
            </thead>
            <tbody>
    `

      localData.forEach(item => {
        html += `
        <tr>
          <td>${item.fileName}</td>
          <td style="text-align: left;">${item.comments || ''}</td>
          <td style="text-align: center;">${item.createdBy}<br>${i18nUnixToDate(item.createdAt)}</td>
          <td style="text-align: center;"><a href="#" class="files-open-file" data-fileid="${item.fileId}"><img src="/images/icons/file_pdf.svg" alt="${item.fileName}" /></a></td>
          <td style="text-align: center;"><a href="#" class="components_fiscoman_filestable_delete_${id}" data-fileid="${item.fileId}"><img src="/images/icons/delete.svg" alt="${item.fileName}" /></a></td>
        </tr>
      `
      })

      html += `
            </tbody>
        </table>
    </div>
    `
      targetElement.innerHTML = securitySafeHtml(html)
    } catch (err) {
      console.error('Failed to load documents', err)
      targetElement.innerHTML = '<p class="text-danger">Error loading documents.</p>'
    }
    // const container = $('.documents_provincial_tax_git__ca_container tbody')
  }

  async function reload (newRpc) {
    rpc = newRpc ? { ...rpc, ...newRpc } : rpc
    await buildDocsTable()
  }

  if (loadOnAttach) {
    buildDocsTable()
  }

  document.body.addEventListener('click', async (event) => {
    const target = event.target.closest(`.components_fiscoman_filestable_delete_${id}`)
    if (target) {
      event.preventDefault()
      const fileId = target.getAttribute('data-fileid')

      eventTarget.dispatchEvent(
        new CustomEvent('deleted', { bubbles: true, detail: { fileId } })
      )

      if (onDelete && typeof onDelete === 'function') {
        onDelete(fileId)
      }
    }
  })

  return {
    reload,
    getData () {
      return localData
    },
    // ✅ EventTarget API passthrough
    addEventListener: (...args) => eventTarget.addEventListener(...args),
    removeEventListener: (...args) => eventTarget.removeEventListener(...args),
    dispatchEvent: (...args) => eventTarget.dispatchEvent(...args)
  }
}
