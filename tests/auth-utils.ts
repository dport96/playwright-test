/* eslint-disable no-await-in-loop */
/* eslint-disable import/no-extraneous-dependencies */
import { test as base, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Base configuration
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const SESSION_STORAGE_PATH = path.join(__dirname, 'playwright-auth-sessions');
const DEBUG_SESSION = process.env.DEBUG_SESSION === 'true';

// Ensure session directory exists
if (!fs.existsSync(SESSION_STORAGE_PATH)) {
  console.log(`Creating session storage ${SESSION_STORAGE_PATH}`);
  fs.mkdirSync(SESSION_STORAGE_PATH, { recursive: true });
}

// Define our custom fixtures
interface AuthFixtures {
  getUserPage: (email: string, password: string) => Promise<Page>;
}

/**
 * Helper function to get unique array values without using Set spread operator
 */
function getUniqueValues(array: string[]): string[] {
  const uniqueValues: string[] = [];
  array.forEach(item => {
    if (uniqueValues.indexOf(item) === -1) {
      uniqueValues.push(item);
    }
  });
  return uniqueValues;
}

/**
 * Authenticate using the UI with robust waiting and error handling
 */
async function authenticateWithUI(
  page: Page,
  email: string,
  password: string,
  sessionName: string
): Promise<void> {
  const sessionPath = path.join(SESSION_STORAGE_PATH, `${sessionName}.json`);
  console.log(`[AUTH] Looking for session file: ${sessionPath}`);
  
  // Try to restore session from storage if available
  if (fs.existsSync(sessionPath)) {
    console.log(`[AUTH] Session file found for ${email}. Attempting to restore...`);
    
    try {
      // Read and parse session data
      const sessionFileContent = fs.readFileSync(sessionPath, 'utf8');
      console.log(`[AUTH] Session file size: ${sessionFileContent.length} bytes`);
      
      if (DEBUG_SESSION) {
        console.log(`[AUTH] Session file content: ${sessionFileContent.substring(0, 100)}...`);
      }
      
      const sessionData = JSON.parse(sessionFileContent);
      
      if (!sessionData.cookies || !Array.isArray(sessionData.cookies) || sessionData.cookies.length === 0) {
        console.log(`[AUTH] Session file does not contain valid cookies array. Found: ${JSON.stringify(sessionData).substring(0, 100)}...`);
        throw new Error('Invalid session data structure');
      }
      
      console.log(`[AUTH] Found ${sessionData.cookies.length} cookies in session file`);
      
      // Log cookie domains for debugging - using our helper function instead of Set
      const cookieDomains = getUniqueValues(sessionData.cookies.map((c: any) => c.domain));
      console.log(`[AUTH] Cookie domains in session: ${cookieDomains.join(', ')}`);
      
      // Add cookies to browser context
      await page.context().addCookies(sessionData.cookies);
      console.log(`[AUTH] Cookies added to browser context`);

      // Navigate to homepage to verify session
      console.log(`[AUTH] Navigating to ${BASE_URL} to verify session`);
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      console.log(`[AUTH] Page loaded, checking authentication state`);

      // Check if we're authenticated
      const authChecks = [
        { name: "email text", check: page.getByText(email).isVisible() },
        { name: "email button", check: page.getByRole('button', { name: email }).isVisible() },
        { name: "sign out text", check: page.getByText('Sign out').isVisible() },
        { name: "sign out button", check: page.getByRole('button', { name: 'Sign out' }).isVisible() }
      ];
      
      // Log what we're looking for
      console.log(`[AUTH] Checking for authenticated elements: ${authChecks.map(c => c.name).join(', ')}`);
      
      // Execute all checks in parallel with a timeout
      const authCheckPromises = authChecks.map(async check => {
        try {
          return { name: check.name, visible: await check.check.catch(() => false) };
        } catch (e) {
          return { name: check.name, visible: false, error: e };
        }
      });
      
      const authCheckResults = await Promise.all(authCheckPromises);
      console.log(`[AUTH] Auth check results: ${JSON.stringify(authCheckResults)}`);
      
      const isAuthenticated = authCheckResults.some(result => result.visible === true);

      if (isAuthenticated) {
        console.log(`[AUTH] ✓ Successfully restored session for ${email}`);
        
        // Capture page HTML for debugging if needed
        if (DEBUG_SESSION) {
          const pageContent = await page.content();
          console.log(`[AUTH] Page content length: ${pageContent.length} bytes`);
          console.log(`[AUTH] Page title: "${await page.title()}"`);
        }
        
        // Take screenshot for visual debugging in CI
        try {
          const screenshotPath = path.join(SESSION_STORAGE_PATH, `${sessionName}-restored.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          console.log(`[AUTH] Session restoration screenshot saved to ${screenshotPath}`);
        } catch (screenshotError) {
          console.log(`[AUTH] Failed to take screenshot: ${screenshotError}`);
        }
        
        return; // Exit early - session successfully restored
      }

      console.log(`[AUTH] × Session restoration attempt failed - no authentication indicators found on page`);
      
      // Capture current cookies for debugging
      const currentCookies = await page.context().cookies();
      console.log(`[AUTH] Current cookies count after restoration attempt: ${currentCookies.length}`);
      
      if (DEBUG_SESSION) {
        // Take screenshot of failed restoration 
        try {
          const screenshotPath = path.join(SESSION_STORAGE_PATH, `${sessionName}-restoration-failed.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          console.log(`[AUTH] Failed restoration screenshot saved to ${screenshotPath}`);
        } catch (screenshotError) {
          console.log(`[AUTH] Failed to take screenshot: ${screenshotError}`);
        }
      }
      
      console.log(`[AUTH] × Saved session for ${email} appears to be invalid or expired, re-authenticating...`);
    } catch (error) {
      console.log(`[AUTH] × Error restoring session: ${error}`);
      console.log(`[AUTH] Stack trace: ${error.stack || 'No stack trace available'}`);
    }
  } else {
    console.log(`[AUTH] No existing session found at ${sessionPath}`);
  }

  // If session restoration fails or doesn't exist, authenticate via UI
  try {
    console.log(`[AUTH] → Authenticating ${email} via UI...`);

    // Navigate to login page
    console.log(`[AUTH] Navigating to ${BASE_URL}/auth/signin`);
    await page.goto(`${BASE_URL}/auth/signin`);
    await page.waitForLoadState('networkidle');
    console.log(`[AUTH] Login page loaded`);

    // Take screenshot before login attempt
    if (DEBUG_SESSION) {
      try {
        const screenshotPath = path.join(SESSION_STORAGE_PATH, `${sessionName}-before-login.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`[AUTH] Pre-login screenshot saved to ${screenshotPath}`);
      } catch (screenshotError) {
        console.log(`[AUTH] Failed to take screenshot: ${screenshotError}`);
      }
    }

    // Fill in credentials with retry logic
    console.log(`[AUTH] Filling login form fields`);
    await fillFormWithRetry(page, [
      { selector: 'input[name="email"]', value: email },
      { selector: 'input[name="password"]', value: password },
    ]);

    // Click submit button and wait for navigation
    console.log(`[AUTH] Looking for sign-in button`);
    const submitButton = page.getByRole('button', { name: /sign[ -]?in/i });
    const isSubmitVisible = await submitButton.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (!isSubmitVisible) {
      console.log(`[AUTH] Primary sign-in button not found, trying alternative login button`);
      const altButton = page.getByRole('button', { name: /log[ -]?in/i });
      const isAltVisible = await altButton.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (isAltVisible) {
        console.log(`[AUTH] Alternative login button found, clicking`);
        await altButton.click();
      } else {
        console.log(`[AUTH] No login buttons found, attempting to locate any submit buttons`);
        // Last resort - try to find any button that might be a submit
        const anySubmit = page.locator('button[type="submit"]');
        if (await anySubmit.count() > 0) {
          console.log(`[AUTH] Found submit button, clicking`);
          await anySubmit.first().click();
        } else {
          throw new Error('No login/submit buttons found on page');
        }
      }
    } else {
      console.log(`[AUTH] Found sign-in button, clicking`);
      await submitButton.click();
    }

    // Wait for navigation to complete
    console.log(`[AUTH] Waiting for navigation after login submission`);
    await page.waitForLoadState('networkidle');
    console.log(`[AUTH] Page loaded after login attempt`);

    // Take screenshot after login attempt
    if (DEBUG_SESSION) {
      try {
        const screenshotPath = path.join(SESSION_STORAGE_PATH, `${sessionName}-after-login.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`[AUTH] Post-login screenshot saved to ${screenshotPath}`);
      } catch (screenshotError) {
        console.log(`[AUTH] Failed to take screenshot: ${screenshotError}`);
      }
    }

    // Verify authentication was successful
    console.log(`[AUTH] Verifying authentication success`);
    await expect(async () => {
      const authCheckPromises = [
        page.getByText(email).isVisible().then(visible => ({ success: visible, element: 'email text' })),
        page.getByRole('button', { name: email }).isVisible().then(visible => ({ success: visible, element: 'email button' })),
        page.getByText('Sign out').isVisible().then(visible => ({ success: visible, element: 'sign out text' })),
        page.getByRole('button', { name: 'Sign out' }).isVisible().then(visible => ({ success: visible, element: 'sign out button' })),
      ];
      
      const results = await Promise.allSettled(authCheckPromises);
      const fulfilledResults = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
      
      // Log individual results
      fulfilledResults.forEach(result => {
        console.log(`[AUTH] Auth check for "${result.element}": ${result.success ? 'visible' : 'not visible'}`);
      });
      
      const authState = fulfilledResults.find(r => r.success) || { success: false };
      
      expect(authState.success).toBeTruthy();
    }).toPass({ timeout: 10000 });

    // Save session for future tests
    console.log(`[AUTH] Authentication successful, saving session`);
    const cookies = await page.context().cookies();
    console.log(`[AUTH] Captured ${cookies.length} cookies to save`);
    
    if (cookies.length === 0) {
      console.log(`[AUTH] Warning: No cookies available to save`);
    } else {
      const cookieDomains = getUniqueValues(cookies.map(c => c.domain));
      console.log(`[AUTH] Cookie domains being saved: ${cookieDomains.join(', ')}`);
    }
    
    const sessionData = { cookies };
    fs.writeFileSync(sessionPath, JSON.stringify(sessionData));
    console.log(`[AUTH] Session saved to ${sessionPath} (${fs.statSync(sessionPath).size} bytes)`);
    
    console.log(`[AUTH] ✓ Successfully authenticated ${email} and saved session`);
  } catch (error) {
    console.error(`[AUTH] × Authentication failed for ${email}:`, error);
    console.log(`[AUTH] Error stack: ${error.stack || 'No stack trace available'}`);
    
    // Capture page state for debugging
    if (DEBUG_SESSION) {
      try {
        console.log(`[AUTH] Page URL at failure: ${page.url()}`);
        console.log(`[AUTH] Page title at failure: "${await page.title()}"`);
        
        const pageContent = await page.content();
        const contentPreview = pageContent.substring(0, 500) + '... [truncated]';
        console.log(`[AUTH] Page content preview at failure: ${contentPreview}`);
        
        const screenshotPath = path.join(SESSION_STORAGE_PATH, `${sessionName}-auth-failure.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`[AUTH] Failure screenshot saved to ${screenshotPath}`);
      } catch (debugError) {
        console.log(`[AUTH] Failed to capture debug info: ${debugError}`);
      }
    }
    
    throw new Error(`Authentication failed: ${error}`);
  }
}

/**
 * Helper to fill form fields with retry logic
 */
async function fillFormWithRetry(
  page: Page,
  fields: Array<{ selector: string; value: string }>
): Promise<void> {
  for (const field of fields) {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        console.log(`[AUTH] Filling field ${field.selector} (attempt ${attempts + 1}/${maxAttempts})`);
        const element = page.locator(field.selector);
        
        const isVisible = await element.isVisible({ timeout: 2000 }).catch(() => false);
        if (!isVisible) {
          console.log(`[AUTH] Field ${field.selector} not visible, retrying...`);
          attempts++;
          await page.waitForTimeout(500);
          continue;
        }
        
        await element.waitFor({ state: 'visible', timeout: 2000 });
        console.log(`[AUTH] Clearing field ${field.selector}`);
        await element.clear();
        console.log(`[AUTH] Filling field ${field.selector} with value (${field.value.length} chars)`);
        await element.fill(field.value);
        console.log(`[AUTH] Triggering blur event on field ${field.selector}`);
        await element.evaluate((el) => el.blur()); // Trigger blur event
        console.log(`[AUTH] Successfully filled field ${field.selector}`);
        break;
      } catch (error) {
        attempts++;
        console.log(`[AUTH] Error filling field ${field.selector} (attempt ${attempts}/${maxAttempts}): ${error}`);
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to fill field ${field.selector} after ${maxAttempts} attempts: ${error}`);
        }
        await page.waitForTimeout(500);
      }
    }
  }
}

// Create custom test with authenticated fixtures
export const test = base.extend<AuthFixtures>({
  getUserPage: async ({ browser }, use) => {
    const createUserPage = async (email: string, password: string) => {
      console.log(`[AUTH] Creating authenticated page for user: ${email}`);
      const context = await browser.newContext();
      const page = await context.newPage();

      await authenticateWithUI(page, email, password, `session-${email}`);
      return page;
    };

    await use(createUserPage);
  },
});

export { expect } from '@playwright/test';