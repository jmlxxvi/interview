import { log } from './log.js'

const logContext = 'i18n'

function i18nGetTimezone () {
  return 'America/Argentina/Buenos_Aires'
}

function i18nGetLocale () {
  return 'es'
}

export function i18nNumberFormat (number, options = {}) {
  const locale = 'es' // Default locale

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  }).format(number)
}

export function i18nNumberUnformat (number, locale) {
  if (typeof number !== 'string') {
    number = String(number)
  }

  locale = i18nGetLocale(locale)

  const format = new Intl.NumberFormat(locale)
  const parts = format.formatToParts(12345.6)
  const numerals = Array.from({ length: 10 }).map((_, i) => format.format(i))
  const index = new Map(numerals.map((d, i) => [d, i]))
  const _group = new RegExp(`[${parts.find(d => d.type === 'group').value}]`, 'g')
  const _decimal = new RegExp(`[${parts.find(d => d.type === 'decimal').value}]`)
  const _numeral = new RegExp(`[${numerals.join('')}]`, 'g')

  const _index = (/** @type {string} */d) => index.get(d).toString()

  number = number.trim()
    .replace(_group, '')
    .replace(_decimal, '.')
    .replace(_numeral, _index)

  return number ? +number : NaN
}

// /**
//  * Given a timestamp in seconds (or milliseconds) returns a string with the date and time in the format "MMM d, yyyy, h:mm:ss a" in the timezone specified.
//  * If the timezone is not specified, the user's timezone is used if set, or the default config timezone is used.
//  * If the locale is not specified, the user's locale is used if set, or the default config locale is used.
//  * If the argument is not a number, it is returned as is.
//  * @param {number} timestamp - The timestamp to translate
//  * @param {string} [locale] - The locale to use
//  * @param {string} [time_zone] - The timezone to use
//  * @returns {string} A string with the date and time in the format "MMM d, yyyy, h:mm:ss a" in the timezone specified
//  */
export function i18nUnixToDate (timestamp, showTime = true, locale, timeZone) {
  timeZone = timeZone || i18nGetTimezone()
  locale = locale || i18nGetLocale()

  log(`Timezone: ${timeZone}, Locale: ${locale}`, logContext)

  if (typeof timestamp === 'number') {
    if (timestamp > 9999999999) {
      timestamp = timestamp / 1000
    }

    const options = {
      dateStyle: 'medium',
      timeZone
    }

    if (showTime) {
      options.timeStyle = 'medium'
    }

    return new Intl.DateTimeFormat(locale, options).format(new Date(timestamp * 1e3))
  } else {
    log(`Invalid timestamp: ${timestamp}`, logContext + ':unix2date', true)
    return null
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

// /**
//  * Given an ISO string timestamp returns a string with the date and time in the format "MMM d, yyyy, h:mm:ss a" in the timezone specified.
//  * If the timezone is not specified, the user's timezone is used if set, or the default config timezone is used.
//  * If the locale is not specified, the user's locale is used if set, or the default config locale is used.
//  * If the argument is not a valid ISO string, it is returned as is.
//  * @param {string} timestamp - The ISO timestamp to translate
//  * @param {string} [locale] - The locale to use
//  * @param {string} [time_zone] - The timezone to use
//  * @returns {string} A string with the date and time in the format "MMM d, yyyy, h:mm:ss a" in the timezone specified
//  */
// export function iso2date(timestamp, locale, time_zone) {

//     time_zone = i18nGetTimezone(time_zone);
//     locale = i18nGetLocale(locale);

//     return new Intl.DateTimeFormat(locale, {
//         timeStyle: 'medium',
//         dateStyle: 'medium',
//         timeZone: time_zone
//     }).format(new Date(timestamp));
// }

// /**
//  * Parse a Unix timestamp (in seconds) to a more human-readable format.
//  * @param {number} timestamp The Unix timestamp to parse.
//  * @param {Intl.RelativeTimeFormatUnit} [timeAgo_unit] The time unit to use for calculating the time ago.
//  * @returns {object} An object with the following properties:
//  *  - `year`: The year of the parsed date.
//  *  - `month`: The month of the parsed date, zero-padded.
//  *  - `day`: The day of the parsed date, zero-padded.
//  *  - `hour`: The hour of the parsed date, zero-padded.
//  *  - `minute`: The minute of the parsed date, zero-padded.
//  *  - `day_status`: Whether the date is today, tomorrow, yesterday, or another day.
//  *  - `timeAgo`: The time difference between the parsed date and the current time, using the specified unit.
//  */
// export function parseUnixTimestamp(timestamp, timeAgo_unit) {

//     // We check if the timestamp is less than 9999999999
//     // and convert the Unix timestamp (in milliseconds) to seconds
//     // Example: 1727621669856 Milliseconds Sun Sep 29 2024 14:54:29 GMT+0000
//     if (timestamp < 9999999999) {
//         timestamp = timestamp * 1000;
//     }

//     // Convert the Unix timestamp (in seconds) to milliseconds
//     const date = new Date(timestamp);

//     // Extract date components with zero-padding
//     const year = date.getFullYear();
//     const month = pad(date.getMonth() + 1); // Months are zero-based
//     const day = pad(date.getDate());
//     const hour = pad(date.getHours());
//     const minute = pad(date.getMinutes());

//     // Determine if the date is today, tomorrow, or another day
//     const today = new Date();
//     const tomorrow = new Date();
//     tomorrow.setDate(today.getDate() + 1);
//     const yesterday = new Date();
//     yesterday.setDate(today.getDate() - 1);

//     let day_status;

//     if (date.toDateString() === today.toDateString()) {
//         day_status = 'today';
//     } else if (date.toDateString() === tomorrow.toDateString()) {
//         day_status = 'tomorrow';
//     } else if (date.toDateString() === yesterday.toDateString()) {
//         day_status = 'yesterday';
//     } else {
//         day_status = 'other';
//     }

//     return {
//         year,
//         month,
//         day,
//         hour,
//         minute,
//         day_status,
//         timeAgo: timeAgo(timestamp, timeAgo_unit),
//     };
// }

// /**
//  * Calculate the time difference between the given timestamp and now.
//  *
//  * @param {number} timestamp The timestamp to compare against now
//  * @param {Intl.RelativeTimeFormatUnit} unitType The unit of time to display as the difference.
//  * @param {string} [locale] The locale to use for the date difference.
//  * @param {boolean} [init_cap] Whether to capitalize the first letter of the result.
//  * @returns {string} A string describing the time difference.
//  */
// export function timeAgo(timestamp, unitType, locale, init_cap = true) {

//     locale = i18nGetLocale(locale);

//     // https://ghosty.hashnode.dev/showing-relative-time-using-js-intl-api

//     let unitsOfTimePassed;

//     /** @type {Intl.RelativeTimeFormatUnit} */
//     let displayUnitType;

//     if (timestamp < 9999999999) {
//         timestamp = timestamp * 1000;
//     }

//     const currentTimestamp = Date.now();

//     const timePassedInMilliseconds = currentTimestamp - timestamp;

//     const millsecInOneSec = 1000;
//     const millsecInOneMinute = 60 * millsecInOneSec;
//     const millisecInOneHour = 60 * millsecInOneMinute;
//     const millsecInOneDay = 24 * millisecInOneHour;

//     const daysPassed = timePassedInMilliseconds / millsecInOneDay;
//     const hoursPassed = timePassedInMilliseconds / millisecInOneHour;
//     const minPassed = timePassedInMilliseconds / millsecInOneMinute;
//     const secPassed = timePassedInMilliseconds / millsecInOneSec;

//     /** @type {Intl.RelativeTimeFormatUnit[]} */
//     const unitTypes = ['day', 'hour', 'minute', 'second'];

//     if (Math.abs(daysPassed) > 1 || unitType === 'day') {
//         unitsOfTimePassed = Math.floor(daysPassed)
//         displayUnitType = unitTypes[0]
//         //Math.floor() so that it does not show 1.x days ago , we want non-decimal value for time passed
//     }
//     else if (Math.abs(hoursPassed) > 1 || unitType === 'hour') {
//         unitsOfTimePassed = Math.floor(hoursPassed)
//         displayUnitType = unitTypes[1]
//     }
//     else if (Math.abs(minPassed) > 1 || unitType === 'minute') {
//         unitsOfTimePassed = Math.floor(minPassed)
//         displayUnitType = unitTypes[2]
//     }
//     else {
//         unitsOfTimePassed = Math.floor(secPassed)
//         displayUnitType = unitTypes[3]
//     }
//     /** @type {Intl.RelativeTimeFormatOptions} */
//     const options = {
//         numeric: "auto", // other values: "auto"
//         style: "long", // other values: "short" or "narrow"
//     }
//     const rtf = new Intl.RelativeTimeFormat(locale, options);

//     const displayString = rtf.format(-1 * unitsOfTimePassed, displayUnitType); // "n units of times ago

//     return init_cap ? initcap(displayString) : displayString;

// }

// /**
//  * Replaces the textContent of all elements with class "i18n" with the
//  * corresponding translation from the stateGet("labels") object.
//  *
//  * For example, if the stateGet("labels") object contains the key:value pair
//  * "Hello": "Bonjour", then all elements with class "i18n" and
//  * textContent="Hello" will have their textContent changed to "Bonjour".
//  *
//  * If the key is not found in the stateGet("labels") object, the original
//  * textContent is left unchanged.
//  */
// export function i18nLabels(target = ".i18n") {

//     const nodes = $$(target);

//     const labels = stateGet("labels");

//     if (labels) {

//         for (let i = 0; i < nodes.length; i++) {

//             const label = nodes[i].dataset.label;

//             nodes[i].textContent = labels[label] || `[${label}]` || `[${nodes[i].textContent}]`;
//         }

//     } else {

//         console.warn("No labels found in stateGet('labels').");

//     }

// }

// /**
//  * Returns the translation of a given label from the stateGet("labels") object.
//  *
//  * The returned translation can be modified with the replace and transform arguments.
//  * The replace argument is an array of values to replace placeholders in the
//  * translation. The first element of the array replaces {1}, the second element
//  * replaces {2}, and so on.
//  *
//  * The transform argument is a function that takes the translation as an argument
//  * and returns the modified translation. This can be used to perform more complex
//  * transformations of the translation.
//  *
//  * If the label is not found in the stateGet("labels") object, the original label
//  * is returned.
//  *
//  * @param {string} label The key of the translation to return
//  * @param {Array<string>} [replace] An array of values to replace placeholders in the translation
//  * @param {Function} [transform] A function to transform the translation
//  * @return {string} The translated label
//  */
// export function i18nGetLabel(label, replace, transform) {

//     const labels = stateGet("labels");

//     label = labels && labels[label] || `[${label}]`;

//     // Replace placeholders in the translation
//     if (Array.isArray(replace)) {
//         label = label.replace(/{(\d+)}/g, (match, index) => {
//             return typeof replace[index] !== 'undefined' ? replace[index] : match;
//         });
//     }

//     // Transform the translation with the transform function
//     if (typeof transform === 'function') {
//         label = transform(label);
//     }

//     return label;

// }

// /*

// const CURRENCY_FORMATTER = new Intl.NumberFormat(undefined, {
//   currency: "USD",
//   style: "currency",
// })
// export function formatCurrency(number) {
//   return CURRENCY_FORMATTER.format(number)
// }

// const NUMBER_FORMATTER = new Intl.NumberFormat(undefined)
// export function formatNumber(number) {
//   return NUMBER_FORMATTER.format(number)
// }

// const COMPACT_NUMBER_FORMATTER = new Intl.NumberFormat(undefined, {
//   notation: "compact",
// })
// export function formatCompactNumber(number) {
//   return COMPACT_NUMBER_FORMATTER.format(number)
// }

// const DIVISIONS = [
//   { amount: 60, name: "seconds" },
//   { amount: 60, name: "minutes" },
//   { amount: 24, name: "hours" },
//   { amount: 7, name: "days" },
//   { amount: 4.34524, name: "weeks" },
//   { amount: 12, name: "months" },
//   { amount: Number.POSITIVE_INFINITY, name: "years" },
// ]
// const RELATIVE_DATE_FORMATTER = new Intl.RelativeTimeFormat(undefined, {
//   numeric: "auto",
// })
// export function formatRelativeDate(toDate, fromDate = new Date()) {
//   let duration = (toDate - fromDate) / 1000

//   for (let i = 0; i <= DIVISIONS.length; i++) {
//     const division = DIVISIONS[i]
//     if (Math.abs(duration) < division.amount) {
//       return RELATIVE_DATE_FORMATTER.format(Math.round(duration), division.name)
//     }
//     duration /= division.amount
//   }
// }

// */
