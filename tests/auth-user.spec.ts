// auth.user.setup.ts
import { test } from './auth-utils';

test('authenticate', async ({ page }) => {
  // Navigate to your Vercel app's login page
  await page.goto('https://localhost:3000/auth/signin');

  // Fill in the login form with your dummy user credentials
  await page.fill('input[name="email"]', 'john@foo.com');
  await page.fill('input[name="password"]', 'changeme'); // Use actual password

  // Submit the form
  await page.click('button[type="submit"]');

  await page.waitForURL('https://localhost:3000/');

  // Navigate to your Vercel app's profile page
  await page.goto('https://campus-resource-scheduler-project.vercel.app/profile');

  // Save the storage state to a file
  await page.context().storageState({ path: 'user-auth.json' });
});
