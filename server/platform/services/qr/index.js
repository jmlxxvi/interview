import QRCode from 'qrcode'

/**
 * @typedef {object} QRReturnType
 * @property {string|null} error
 * @property {string} qr_url
 */

/**
 * Generates a QR code for the given text and returns its data URL.
 *
 * reference: https://github.com/soldair/node-qrcode
 *
 * @param {string} text The text to be encoded in the QR code.
 * @param {string} ecl The error correction level of the QR code. Valid values are: L, M, Q, H.
 * @return {Promise<QRReturnType>} A promise resolving with an object containing error and qr_url properties.
 * error will be null on success, and a string describing the error if one occurs.
 * qr_url will be a data URL for the QR code on success, and null on error.
 */
export async function qr (text, ecl = 'H') {
  const options = {
    errorCorrectionLevel: ecl
  }

  const qrUrl = QRCode.toDataURL(text, options)

  return {
    error: null,
    qrUrl
  }
}
