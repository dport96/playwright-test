/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/no-extraneous-dependencies */
import { test as base, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Base configuration
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const SESSION_STORAGE_PATH = path.join(__dirname, 'playwright-auth-sessions');
const DEBUG_SESSION = true;

interface AuthFixtures {
  getUserPage: (email: string, password: string) => Promise<Page>;
}

// Ensure session directory exists
if (!fs.existsSync(SESSION_STORAGE_PATH)) {
  fs.mkdirSync(SESSION_STORAGE_PATH, { recursive: true });
}

// Helper functions
function getUniqueValues(array: string[]): string[] {
  const seen = new Set<string>();
  return array.filter(item => {
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });
}

function getErrorDetails(error: unknown): { message: string; stack: string } {
  return error instanceof Error 
    ? { message: error.message, stack: error.stack || 'No stack' }
    : { message: String(error), stack: 'No stack' };
}

async function verifyCredentials(email: string, password: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Invalid test credentials');
  }
}

async function fillFormWithRetry(page: Page, fields: Array<{ selector: string; value: string }>): Promise<void> {
  // Capture hidden fields
const hiddenFields = await page.$$eval('input[type="hidden"]', inputs =>
  inputs
    .filter((input): input is HTMLInputElement => input instanceof HTMLInputElement)
    .map(input => ({
      selector: `input[name="${input.name}"]`,
      value: input.value
    }))
);
  for (const field of [...hiddenFields, ...fields]) {
    let attempts = 0;
    while (attempts < 3) {
      try {
        const locator = page.locator(field.selector);
        await locator.waitFor({ state: 'visible', timeout: 2000 });
        await locator.fill(field.value);
        break;
      } catch (error) {
        if (++attempts >= 3) throw error;
        await page.waitForTimeout(500);
      }
    }
  }
}

async function authenticateWithUI(page: Page, email: string, password: string, sessionName: string): Promise<void> {
  const sessionPath = path.join(SESSION_STORAGE_PATH, `${sessionName}.json`);
  
  // Try session restoration
  if (fs.existsSync(sessionPath)) {
    const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    
    // Validate essential cookies
    const requiredCookies = ['next-auth.session-token', 'next-auth.csrf-token'];
    const missing = requiredCookies.filter(name => 
      !sessionData.cookies?.some((c: any) => c.name === name)
    );
    if (missing.length) throw new Error(`Missing cookies: ${missing.join(', ')}`);

    await page.context().addCookies(sessionData.cookies);
    await page.goto(BASE_URL);
    
    // API-based session validation
    const isValid = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/auth/session');
        return (await res.json()).user?.email !== undefined;
      } catch {
        return false;
      }
    });

    if (isValid) {
      console.log('Session restored via API validation');
      return;
    }
  }

  // Fresh authentication
  await verifyCredentials(email, password);
  await page.goto(`${BASE_URL}/auth/signin`);

  // Handle CSRF token
  const csrfToken = await page.locator('input[name="csrfToken"]').inputValue().catch(() => null);
  const formData = [
    { selector: 'input[name="email"]', value: email },
    { selector: 'input[name="password"]', value: password },
    ...(csrfToken ? [{ selector: 'input[name="csrfToken"]', value: csrfToken }] : [])
  ];

  await fillFormWithRetry(page, formData);

  // Submit with network monitoring
  const [response] = await Promise.all([
    page.waitForResponse(res => 
      res.url().includes('/api/auth/callback/credentials') &&
      (res.status() === 200 || res.status() === 401),
    { timeout: 15000 }
    ),
    page.click('button[type="submit"]'),
  ]);

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Login failed: ${response.status()} ${body}`);
  }

  // Error page handling
await page.waitForURL(url => !url.pathname.startsWith('/auth/error'), { timeout: 10000 })
  .catch(async error => {
    const currentUrl = new URL(page.url());
    if (currentUrl.pathname.startsWith('/auth/error')) {
      const errorMsg = await page.locator('[role="alert"]').textContent() || 'Unknown error';
      throw new Error(`Auth error page: ${errorMsg}`);
    }
    throw error;
  });


  // Save updated session
  const cookies = await page.context().cookies();
  const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage));
  fs.writeFileSync(sessionPath, JSON.stringify({ cookies, localStorage }));
}

// Fixture setup
export const test = base.extend<AuthFixtures>({
  getUserPage: async ({ browser }, use) => {
    const createPage = async (email: string, password: string) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await authenticateWithUI(page, email, password, `session-${email}`);
      return page;
    };
    await use(createPage);
  },
});

export { expect };
