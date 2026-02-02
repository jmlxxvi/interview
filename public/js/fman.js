export function fmanValidateTaxId (cuit) {
  // Eliminar caracteres no numéricos
  cuit = cuit.replace(/[^0-9]/g, '')

  // Validar longitud
  if (cuit.length !== 11) return false

  // Coeficientes para la validación
  const coeficientes = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]

  // Obtener los primeros 10 dígitos
  const cuitArray = cuit.split('').map(Number)
  const digitoVerificador = cuitArray.pop()

  // Calcular la suma ponderada
  const suma = cuitArray.reduce((acc, num, index) => acc + num * coeficientes[index], 0)

  // Obtener el dígito verificador esperado
  let verificadorCalculado = 11 - (suma % 11)
  if (verificadorCalculado === 11) verificadorCalculado = 0
  if (verificadorCalculado === 10) verificadorCalculado = 9

  // Comparar con el dígito verificador real
  return verificadorCalculado === digitoVerificador
}

export function fmanFormatTaxId (input) {
  // Ensure the input is a string and has the correct length
  // if (typeof input !== 'string' || input.length < 3) {
  //     return "";
  // }

  if (!input) {
    return ''
  }

  if (typeof input === 'number') {
    input = input.toString()
  }

  // Extract the first 2 characters
  const firstPart = input.slice(0, 2)

  // Extract the middle part (from index 2 to the second last character)
  const middlePart = input.slice(2, -1)

  // Extract the last character
  const lastPart = input.slice(-1)

  // Combine the parts with hyphens
  return `${firstPart}-${middlePart}-${lastPart}`
}

export function fmanUnformatTaxId (input) {
  if (!input) {
    return ''
  }

  if (typeof input === 'number') {
    input = input.toString()
  }

  // Eliminar caracteres no numéricos
  const cuit = input.replace(/\D/g, '')

  return cuit
}

export function fmanFormatTaxIdInput (input) {
  // Eliminar caracteres no numéricos
  let cuit = input.value.replace(/\D/g, '')

  // Limitar a 11 caracteres numéricos
  cuit = cuit.slice(0, 11)

  // Aplicar la máscara XX-XXXXXXXX-X
  let cuitFormateado = ''
  if (cuit.length > 2) {
    cuitFormateado = cuit.slice(0, 2) + '-'
    if (cuit.length > 10) {
      cuitFormateado += cuit.slice(2, 10) + '-' + cuit.slice(10)
    } else {
      cuitFormateado += cuit.slice(2)
    }
  } else {
    cuitFormateado = cuit
  }

  // Asignar el valor formateado al input
  input.value = cuitFormateado
}
