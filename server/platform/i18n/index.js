import { readFile } from 'fs/promises'

// import log from "../log.js";

// TODO: in the future it will possible to use this. Now (Node 20) it is still experimental.
// https://nodejs.org/docs/latest-v20.x/api/esm.html#import-attributes
// import i18n_data from "./labels.json" with { type: "json" };
const langData = JSON.parse((await readFile(new URL('./labels.json', import.meta.url))).toString())

const timeZonesData = JSON.parse((await readFile(new URL('./time_zones.json', import.meta.url))).toString())
const countriesData = JSON.parse((await readFile(new URL('./countries.json', import.meta.url))).toString())
const languagesData = JSON.parse((await readFile(new URL('./languages.json', import.meta.url))).toString())
// const logContext = "i18n";

/**
 * Returns and object with all the data defined on labels.json in the laguage referenced on the argument
 * @param {string} lang The language to get the data from
 * @returns An object with all the labels for a given language
 */
export const getLangData = (lang) => langData[lang]

/**
 * Returns true if the language exists on lang data (labels.json)
 * @param {string} lang The language to check if exists
 * @returns True id there is data for that language
 */
export const languageExists = (lang) => langData && typeof langData[lang] !== 'undefined'

/**
 * Returns a label translated to the language passed a argument
 * @param {string} language The language to get the label from or
 * @param {string} label The label to translate
 * @returns The label translated
 */
export const i18nGetLabel = (language, label) => (language && langData[language] && langData[language][label]) ? langData[language][label] : `[${label}]`

/**
 * Given a timestamp in seconds (or milliseconds) returns a string with the date and time in the format "MMM d, yyyy, h:mm:ss a" in the timezone "UTC".
 * @param {number} timestamp The timestamp to translate
 * @returns A string with the date and time in the format "MMM d, yyyy, h:mm:ss a" in the timezone "UTC" or the same value if the argument is not a number
 */
export function unix2date (timestamp) {
  if (typeof timestamp === 'number') {
    return new Intl.DateTimeFormat('en-US', {
      timeStyle: 'medium',
      dateStyle: 'medium',
      timeZone: 'UTC'
    }).format(new Date(timestamp * 1e3))
  } else {
    // log(`Invalid timestamp: ${timestamp}`, logContext, "error");
    return timestamp
  }
}

export function numberFormat (number) {
  return new Intl.NumberFormat().format(number)
}

export function timezones () {
  return timeZonesData
}
export function countries () {
  return countriesData
}

export function languages () {
  return languagesData
}

function i18nGetTimezone () {
  return 'America/Argentina/Buenos_Aires'
}

function i18nGetLocale () {
  return 'es'
}

export function i18nUnixToDate (timestamp, locale, timeZone) {
  timeZone = i18nGetTimezone(timeZone)
  locale = i18nGetLocale(locale)

  if (typeof timestamp === 'number') {
    if (timestamp > 9999999999) {
      timestamp = timestamp / 1000
    }

    return new Intl.DateTimeFormat(locale, {
      timeStyle: 'medium',
      dateStyle: 'medium',
      timeZone
    }).format(new Date(timestamp * 1e3))
  } else {
    return timestamp
  }
}

export function i18nDateToUnix (dateString, milliseconds = false) {
  if (dateString) {
    const divisor = milliseconds ? 1 : 1000

    const ts = Math.floor(new Date(dateString).getTime() / divisor)

    return isNaN(ts) ? null : ts
  } else {
    return null
  }
}
