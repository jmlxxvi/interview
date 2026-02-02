import { test, expect } from '@playwright/test'

import { testConfig } from '../../config.js'

test.describe('Navigation Tests', () => {
  test('should navigate to the home page', async ({ page }) => {
    await page.goto(testConfig.baseUrl)
    await expect(page).toHaveURL(`${testConfig.baseUrl}/`)
  })
})
