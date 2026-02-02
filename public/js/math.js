/**
 * Safely rounds numbers for monetary calculations
 * Handles edge cases and provides consistent results
 */
export function preciseRound (value, decimals = 2) {
  // Handle edge cases
  if (value === null || value === undefined || isNaN(value)) {
    return 0
  }

  // Convert to number if it's a string
  const num = Number(value)

  if (num === 0) return 0

  // Use toFixed with correction for rounding errors
  const factor = Math.pow(10, decimals)
  const rounded = Math.round((num + Number.EPSILON) * factor) / factor

  return rounded
}

// Usage
// console.log(preciseRound(0.1 + 0.2)) // 0.3
// console.log(preciseRound(0.3 * 3)) // 0.9
// console.log(preciseRound(1.005, 2)) // 1.01
