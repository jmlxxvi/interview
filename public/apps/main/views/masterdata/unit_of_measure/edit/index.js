import { log } from '../../../../../../js/log.js'
import { $ } from '../../../../../../js/dom.js'
import { backendRpc } from '../../../../../../js/backend.js'
import { AlertBox, ConfirmBox } from '../../../../../../components/Modal/Dialogs.js'
import { routerNavigate } from '../../../../../../js/router.js'

const logContext = 'MASTERDATA:UOM:EDIT'

let unitId = null

const code = $('#mdauomedt__code')
const name = $('#mdauomedt__name')
const category = $('#mdauomedt__category')
const isBase = $('#mdauomedt__is_base')
const baseUnit = $('#mdauomedt__base_unit')
const conversionFactor = $('#mdauomedt__conversion_factor')
const description = $('#mdauomedt__description')
const submit = $('#mdauomedt__submit')
const remove = $('#mdauomedt__delete')

const baseUnitSection = $('#mdauomedt__base_unit_section')
const conversionSection = $('#mdauomedt__conversion_section')

// Toggle base unit fields based on isBase checkbox
isBase.addEventListener('change', () => {
  if (isBase.checked) {
    baseUnitSection.style.display = 'none'
    conversionSection.style.display = 'none'
    baseUnit.value = ''
    conversionFactor.value = '1'
  } else {
    baseUnitSection.style.display = 'block'
    conversionSection.style.display = 'block'
  }
})

remove.addEventListener('click', async () => {
  const confirmed = await ConfirmBox('Are you sure you want to delete this unit of measure?', 'confirm')
  if (!confirmed) {
    return
  }

  const response = await backendRpc(
    'app/masterdata/unit_of_measure',
    'remove',
    { unitId }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/masterdata/unit_of_measure?reload=true')
  }
})

submit.action = async () => {
  if (!code.value || code.value.trim() === '') {
    AlertBox('Please enter a code.', 'error')
    return
  }

  if (!name.value || name.value.trim() === '') {
    AlertBox('Please enter a name.', 'error')
    return
  }

  if (!category.value || category.value.trim() === '') {
    AlertBox('Please select a category.', 'error')
    return
  }

  if (!isBase.checked && !baseUnit.value) {
    AlertBox('Please select a base unit or mark this as a base unit.', 'error')
    return
  }

  if (!isBase.checked && (!conversionFactor.value || parseFloat(conversionFactor.value) <= 0)) {
    AlertBox('Please enter a valid conversion factor.', 'error')
    return
  }

  const response = await backendRpc(
    'app/masterdata/unit_of_measure',
    'save',
    {
      unitId,
      code: code.value.trim(),
      name: name.value.trim(),
      category: category.value.trim(),
      conversionFactor: parseFloat(conversionFactor.value),
      baseUnitId: isBase.checked ? null : baseUnit.value,
      isBase: isBase.checked,
      description: description.value.trim()
    }
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
  } else {
    routerNavigate('/masterdata/unit_of_measure?reload=true')
  }
}

function viewReset () {
  code.value = ''
  name.value = ''
  category.value = ''
  isBase.checked = false
  baseUnit.value = ''
  conversionFactor.value = '1'
  description.value = ''
  baseUnitSection.style.display = 'block'
  conversionSection.style.display = 'block'
}

async function loadBaseUnits () {
  const response = await backendRpc(
    'app/masterdata/unit_of_measure',
    'listAll',
    {}
  )

  if (response.status.error) {
    AlertBox(response.status.message, 'error')
    return
  }

  // Clear existing options except the first one
  baseUnit.innerHTML = '<option value="">Select base unit</option>'

  // Group by category
  const byCategory = {}
  response.data.forEach(unit => {
    if (!byCategory[unit.category]) {
      byCategory[unit.category] = []
    }
    byCategory[unit.category].push(unit)
  })

  // Add options grouped by category
  Object.keys(byCategory).sort().forEach(cat => {
    const optgroup = document.createElement('optgroup')
    optgroup.label = cat
    byCategory[cat].forEach(unit => {
      const option = document.createElement('option')
      option.value = unit.id
      option.textContent = `${unit.code} - ${unit.name}`
      optgroup.appendChild(option)
    })
    baseUnit.appendChild(optgroup)
  })
}

export async function show (params) {
  unitId = params.unitId

  remove.style.visibility = 'hidden'

  log('View show', logContext)

  viewReset()
  await loadBaseUnits()

  if (unitId) {
    remove.style.visibility = 'visible'

    const response = await backendRpc(
      'app/masterdata/unit_of_measure',
      'find',
      { unitId }
    )

    if (response.status.error) {
      AlertBox(response.status.message, 'error')
    } else {
      if (!response.data) {
        AlertBox('Unit of measure not found', 'error')
        routerNavigate('/masterdata/unit_of_measure?reload=true')
        return
      }

      code.value = response.data.code
      name.value = response.data.name
      category.value = response.data.category
      isBase.checked = response.data.isBase
      baseUnit.value = response.data.baseUnitId || ''
      conversionFactor.value = response.data.conversionFactor
      description.value = response.data.description || ''

      // Update visibility based on isBase
      if (isBase.checked) {
        baseUnitSection.style.display = 'none'
        conversionSection.style.display = 'none'
      }
    }
  }
}

export async function hide () {
  log('View hide', logContext)
}
