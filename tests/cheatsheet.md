# Playwright Testing Cheatsheet

## Installation

```bash
# Install Playwright
npm init playwright@latest

# Install browsers (optional - Playwright installs them automatically)
npx playwright install
```

## Basic Test Structure

```javascript
const { test, expect } = require('@playwright/test');

test('basic test', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle('Example Domain');
});
```

## Navigation

```javascript
// Navigate to URL
await page.goto('https://example.com');

// Go back/forward
await page.goBack();
await page.goForward();

// Reload page
await page.reload();
```

## Locators & Selectors

```javascript
// CSS Selectors
await page.locator('button.submit').click();
await page.locator('#username').fill('user');

// Text selectors
await page.locator('text=Login').click();
await page.locator('text=/Log.*/i').click();

// XPath
await page.locator('//button[@id="submit"]').click();

// Chaining locators
await page.locator('div.form-group').locator('input').fill('value');

// nth element
await page.locator('li').nth(2).click();

// Filtering
await page.locator('button').filter({ hasText: 'Submit' }).click();
```

## Interactions

```javascript
// Click
await page.locator('button').click();
await page.locator('button').click({ button: 'right' }); // right click
await page.locator('button').dblclick();

// Fill inputs
await page.locator('input').fill('value');
await page.locator('input').pressSequentially('text'); // with delays

// Checkboxes & Radio buttons
await page.locator('checkbox').check();
await page.locator('checkbox').uncheck();
await page.locator('radio').setChecked(true);

// Select dropdowns
await page.locator('select').selectOption('value');
await page.locator('select').selectOption({ label: 'Option' });
await page.locator('select').selectOption({ index: 1 });

// Keyboard
await page.locator('input').press('Enter');
await page.keyboard.press('Control+A');
await page.keyboard.type('hello');

// Mouse
await page.mouse.move(x, y);
await page.mouse.down();
await page.mouse.up();
```

## Assertions

```javascript
// Page assertions
await expect(page).toHaveTitle('Title');
await expect(page).toHaveURL('https://example.com');
await expect(page).toHaveURL(/example/);

// Element assertions
await expect(page.locator('element')).toBeVisible();
await expect(page.locator('element')).toBeHidden();
await expect(page.locator('element')).toBeEnabled();
await expect(page.locator('element')).toBeDisabled();
await expect(page.locator('element')).toBeChecked();
await expect(page.locator('element')).toHaveText('text');
await expect(page.locator('element')).toContainText('text');
await expect(page.locator('element')).toHaveValue('value');
await expect(page.locator('element')).toHaveAttribute('attr', 'value');
await expect(page.locator('element')).toHaveClass('class-name');
await expect(page.locator('element')).toHaveCount(3);

// Soft assertions (continue on failure)
await expect.soft(page.locator('element')).toBeVisible();

// Custom timeout
await expect(page.locator('element')).toBeVisible({ timeout: 10000 });
```

## Waiting & Timeouts

```javascript
// Default timeout (30 seconds)
await page.locator('button').click();

// Custom timeout
await page.locator('button').click({ timeout: 5000 });

// Wait for element
await page.locator('element').waitFor();
await page.locator('element').waitFor({ state: 'visible' });

// Wait for navigation
await Promise.all([
  page.waitForNavigation(),
  page.locator('button').click()
]);

// Wait for URL
await page.waitForURL('**/dashboard');

// Wait for timeout
await page.waitForTimeout(3000); // Avoid when possible

// Wait for event
await page.waitForEvent('download');
```

## Frames & Windows

```javascript
// Frames
const frame = page.frame({ name: 'frame-name' });
await frame.locator('button').click();

// Or by URL
const frame = page.frame({ url: /example/ });

// New tabs/windows
const [newPage] = await Promise.all([
  page.context().waitForEvent('page'),
  page.locator('a[target="_blank"]').click()
]);
await newPage.locator('button').click();
```

## Network & API

```javascript
// Mock responses
await page.route('**/api/users', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ users: [] })
  });
});

// Intercept requests
await page.route('**/*', route => {
  console.log(route.request().url());
  route.continue();
});

// Wait for request/response
const [response] = await Promise.all([
  page.waitForResponse('**/api/users'),
  page.locator('button').click()
]);

// Wait for request
await page.waitForRequest('**/api/users');

// Set headers
await page.setExtraHTTPHeaders({
  'Authorization': 'Bearer token'
});
```

## API Testing

```javascript
import { test, expect } from '@playwright/test';

test('should create a new user', async ({ request }) => {
  const response = await request.post('/api/users', {
    data: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  });

  // Assert status code
  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(201);

  // Assert JSON body
  const body = await response.json();
  expect(body.user).toMatchObject({
    name: 'John Doe',
    email: 'john@example.com'
  });
});
```

## File Operations

```javascript
// File uploads
await page.locator('input[type="file"]').setInputFiles('file.txt');
await page.locator('input[type="file"]').setInputFiles(['file1.txt', 'file2.txt']);

// File downloads
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.locator('a#download').click()
]);
await download.saveAs('path/to/save');

// Read file content
const content = await fs.readFile('file.txt', 'utf8');
```

## Screenshots & Videos

```javascript
// Take screenshot
await page.screenshot({ path: 'screenshot.png' });
await page.locator('element').screenshot({ path: 'element.png' });

// Full page screenshot
await page.screenshot({ path: 'fullpage.png', fullPage: true });

// Record video (configure in playwright.config.js)
// videosPath: 'videos/'

// Capture screenshot on failure (in config)
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure'
}
```

## Authentication

```javascript
// Store authentication state
const { browser } = await chromium.launch();
const context = await browser.newContext();
await context.addCookies([{ name: 'session', value: 'token', url: 'https://example.com' }]);
const page = await context.newPage();

// Save storage state
await context.storageState({ path: 'auth.json' });

// Reuse storage state
const context = await browser.newContext({ storageState: 'auth.json' });
```

## Fixtures & Hooks

```javascript
// Test hooks
test.beforeAll(async () => {
  // Runs once before all tests
});

test.beforeEach(async ({ page }) => {
  // Runs before each test
  await page.goto('/');
});

test.afterEach(async () => {
  // Runs after each test
});

test.afterAll(async () => {
  // Runs after all tests
});

// Custom fixtures
import { test as base } from '@playwright/test';

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('#username', 'user');
    await page.fill('#password', 'pass');
    await page.click('#login');
    await use(page);
  }
});

test('test with auth', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
});
```

## Configuration (playwright.config.js)

```javascript
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'https://example.com',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    }
  ]
});
```

## Running Tests

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/login.spec.js

# Run tests with specific browser
npx playwright test --project=chromium

# Run tests in headed mode
npx playwright test --headed

# Run tests with debug
npx playwright test --debug

# Generate HTML report
npx playwright show-report

# Run tests with specific grep pattern
npx playwright test -g "login"

# Update snapshots
npx playwright test --update-snapshots
```

## Debugging

```javascript
// Pause test execution
await page.pause();

// Debug in browser
await page.evaluate(() => {
  debugger;
});

// Console logging
console.log('Current URL:', page.url());

// Slow down operations
await page.setDefaultTimeout(5000);
await page.setDefaultNavigationTimeout(10000);
```

## Useful Patterns

```javascript
// Retry pattern
async function retryOperation(operation, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await page.waitForTimeout(1000);
    }
  }
}

// Dynamic element waiting
async function waitForElement(selector, timeout = 10000) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  return element;
}

// Page object pattern
class LoginPage {
  constructor(page) {
    this.page = page;
    this.username = page.locator('#username');
    this.password = page.locator('#password');
    this.submit = page.locator('#submit');
  }
  
  async login(user, pass) {
    await this.username.fill(user);
    await this.password.fill(pass);
    await this.submit.click();
  }
}
```

## How to Run Playwright Tests

### 1. Run All Tests

```bash
# Run all tests in all browsers
npx playwright test

# Run tests in headed mode (see browsers)
npx playwright test --headed

# Run tests with UI mode (interactive)
npx playwright test --ui
```

### 2. Run Specific Tests

```bash
# Run a single test file
npx playwright test tests/login.spec.js

# Run multiple specific files
npx playwright test tests/login.spec.js tests/dashboard.spec.js

# Run tests in a specific directory
npx playwright test tests/auth/

# Run tests with a title matching pattern
npx playwright test -g "login"
npx playwright test --grep "login test"

# Run tests that don't match a pattern
npx playwright test --grep-invert "slow"
```

### 3. Browser-Specific Execution

```bash
# Run tests only in Chromium
npx playwright test --project=chromium

# Run tests in specific browsers
npx playwright test --project=chromium --project=firefox

# Run tests on mobile emulation
npx playwright test --project="iPhone 13"
```

### 4. Parallel Execution & Workers

```bash
# Run tests with 4 workers (parallel)
npx playwright test --workers=4

# Run tests in fully parallel mode
npx playwright test --fully-parallel

# Run tests sequentially (no parallelism)
npx playwright test --workers=1
```

### 5. Retry & Timeout Options

```bash
# Retry failed tests twice
npx playwright test --retries=2

# Set global timeout
npx playwright test --timeout=60000

# Update snapshots for visual tests
npx playwright test --update-snapshots
```

### 6. Debugging & Development

```bash
# Run in debug mode (opens Playwright Inspector)
npx playwright test --debug

# Debug a specific test
npx playwright test --debug tests/login.spec.js

# Step through test execution
npx playwright test --trace on
```

### 7. Using playwright.config.js

```javascript
// playwright.config.js
module.exports = {
  // Run tests in parallel with 4 workers
  workers: process.env.CI ? 4 : undefined,
  
  // Retry failing tests in CI
  retries: process.env.CI ? 2 : 0,
  
  // Timeout settings
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  
  // Project-specific settings
  projects: [
    {
      name: 'chromium',
      use: { /* ... */ }
    }
  ]
};
```

### 8. Environment-Specific Execution

```bash
# Set base URL via environment variable
BASE_URL=https://staging.example.com npx playwright test

# Run with different config for CI
npx playwright test --config=playwright.ci.config.js

# Set environment variables
API_KEY=secret npx playwright test
```

### 9. Different Report Formats

```bash
# Default HTML reporter
npx playwright test --reporter=html

# Line reporter (terminal friendly)
npx playwright test --reporter=line

# JSON reporter
npx playwright test --reporter=json

# JUnit reporter for CI systems
npx playwright test --reporter=junit

# Multiple reporters
npx playwright test --reporter=html --reporter=line
```

### 10. Viewing Results

```bash
# Open HTML report after test run
npx playwright show-report

# Open last HTML report
npx playwright show-report report/

# Show test list
npx playwright test --list
```

### 11. Common CI Commands

```bash
# Install browsers and run tests
npx playwright install
npx playwright test

# Run with CI-friendly settings
npx playwright test --workers=4 --retries=2 --reporter=junit

# Install specific browsers for CI
npx playwright install chromium firefox
```

### 12. Package.json Scripts

```javascript
{
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug",
    "test:chromium": "playwright test --project=chromium",
    "test:firefox": "playwright test --project=firefox",
    "test:webkit": "playwright test --project=webkit",
    "test:report": "playwright test --reporter=html",
    "show:report": "playwright show-report",
    "test:ci": "playwright test --workers=4 --retries=2 --reporter=junit"
  }
}
```
### 13. Filtering Tests

```bash
# Run tests from a specific line number
npx playwright test tests/login.spec.js:10

# Run tests matching multiple patterns
npx playwright test -g "login" -g "auth"

# Run tests from a specific describe block
npx playwright test -g "describe block name"
```

### 14. Profile-Based Execution

```javascript
{
  "scripts": {
    "test:quick": "playwright test --grep-invert \"@slow\"",
    "test:slow": "playwright test --grep \"@slow\"",
    "test:smoke": "playwright test --grep \"@smoke\"",
    "test:regression": "playwright test --grep \"@regression\""
  }
}
```

### 15. Debugging Helpers

```bash
# Generate trace files for debugging
npx playwright test --trace on

# Record video of test runs
npx playwright test --video on

# Open trace viewer for last run
npx playwright show-trace test-results/*.zip
```

## Example Workflows

### Quick Development Cycle

```bash
# Run specific test during development
npx playwright test tests/login.spec.js --headed --debug

# After fixing, run it normally
npx playwright test tests/login.spec.js

# Run all tests before committing
npx playwright test
```

### CI Pipeline Example

```bash
# Install dependencies and browsers
npm ci
npx playwright install --with-deps

# Run tests with CI configuration
npx playwright test \
  --workers=4 \
  --retries=2 \
  --reporter=junit \
  --output=test-results/junit.xml

# Generate HTML report for artifacts
npx playwright test --reporter=html
```





