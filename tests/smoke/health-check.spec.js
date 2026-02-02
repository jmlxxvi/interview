import { test, expect } from '@playwright/test'

import { testConfig } from '../config.js'

test('health check', async ({ page }) => {
  await page.goto(`${testConfig.baseUrl}/login.html`) // Update with your application's URL
  const status = await page.evaluate(() => document.title) // Example check
  expect(status).toBe('Factory') // Update with the expected title
})
