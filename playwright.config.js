// @ts-check

import { existsSync } from 'node:fs'

import { defineConfig, devices } from '@playwright/test'
import { testConfig } from './tests/config'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Detect Windows Chrome executable path from WSL2
 */
function getWindowsChromePath () {
  const possiblePaths = [
    '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
    '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/mnt/c/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  ]

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      console.log(`✓ Using Windows browser: ${path}`)
      return path
    }
  }

  console.log('⚠ No Windows browser found, using default Playwright browser')
  return null
}

const chromePath = getWindowsChromePath()

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  outputDir: './tests/output', // Where screenshots/videos go
  reporter: [['html', { outputFolder: './tests/reports' }]], /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    // trace: 'on-first-retry',
    // slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0

    baseURL: testConfig.baseUrl,
    trace: 'on', // Always collect trace
    screenshot: 'on', // Always take screenshots
    video: 'on', // Always record video
    navigationTimeout: 30000,
    actionTimeout: 10000,
    slowMo: process.env.TESTING_SLOW_MO ? parseInt(process.env.TESTING_SLOW_MO) : 0

    // Use Windows Chrome if available
    // ...(chromePath && {
    //   channel: undefined, // Don't use Playwright's bundled browser
    //   launchOptions: {
    //     executablePath: chromePath,
    //     slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
    //     args: [
    //       '--disable-dev-shm-usage',
    //       '--no-sandbox',
    //       '--disable-setuid-sandbox',
    //       '--disable-gpu',
    //       '--disable-software-rasterizer',
    //       '--disable-extensions',
    //       // Allow Chrome to run from WSL2
    //       '--remote-debugging-port=9222',
    //       '--disable-background-networking',
    //       '--disable-background-timer-throttling',
    //       '--disable-backgrounding-occluded-windows',
    //       '--disable-breakpad',
    //       '--disable-component-extensions-with-background-pages',
    //       '--disable-features=TranslateUI',
    //       '--disable-ipc-flooding-protection',
    //       '--disable-renderer-backgrounding'
    //     ],
    //     // Increase timeout for browser launch
    //     timeout: 60000
    //   }
    // })
  },

  projects: [
    // Setup project runs first
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/
    },

    // Smoke tests run after setup
    {
      name: 'smoke',
      testMatch: /tests\/smoke\/.*.spec\.js/,
      dependencies: ['setup']
    },

    // E2E tests run after smoke tests
    {
      name: 'e2e',
      testMatch: /tests\/e2e\/.*.spec\.js/,
      dependencies: ['smoke'],
      use: { ...devices['Desktop Chrome'] }
    }
  ]

  // Start server before tests
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000, // 2 minutes for server to start
  //   stdout: 'pipe',
  //   stderr: 'pipe'
  // }
})
