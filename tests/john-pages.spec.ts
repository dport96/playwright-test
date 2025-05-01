// john-pages.spec.ts
import { test, expect } from './auth-utils';

test('can authenticate john', async ({ getUserPage }) => {
  const userPage = await getUserPage('john@foo.com', 'changeme');
  
  await userPage.goto('/');
  await expect(userPage.getByRole('button', { name: 'john@foo.com' })).toBeVisible();
  await expect(customUserPage.getByRole('link', { name: 'Add Stuff' })).toBeVisible();
  await expect(customUserPage.getByRole('link', { name: 'List Stuff' })).toBeVisible();
  await expect(customUserPage.getByRole('button', { name: 'john@foo.com' })).toBeVisible();
  await customUserPage.getByRole('link', { name: 'Add Stuff' }).click();
  await expect(customUserPage.getByRole('heading', { name: 'Add Stuff' })).toBeVisible({ timeout: 100000 });
  await customUserPage.getByRole('link', { name: 'List Stuff' }).click();
  await expect(customUserPage.getByRole('heading', { name: 'Stuff' })).toBeVisible();
});


