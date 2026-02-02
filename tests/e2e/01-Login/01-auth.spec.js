import { test, expect } from '@playwright/test'

import { testConfig } from '../../config.js'

test.describe('Authentication Flows', () => {
  test('User can log in', async ({ page }) => {
    await page.goto(`${testConfig.baseUrl}/login.html`)
    await page.fill('input[id="login__email"]', 'testuser')
    await page.fill('input[id="login__password"]', 'password123')
    await page.click('loading-button[id="login__submit"]')
    await expect(page).toHaveURL(`${testConfig.baseUrl}/dashboard`)
  })

  //   test('User cannot log in with incorrect password', async ({ page }) => {
  //     await page.goto(`${testConfig.baseUrl}/login.html`)
  //     await page.fill('input[id="login__email"]', 'testuser')
  //     await page.fill('input[id="login__password"]', 'wrongpassword')
  //     await page.click('loading-button[id="login__submit"]')
  //     await expect(page.locator('.error-message')).toContainText('Invalid credentials')
  //   })
})
