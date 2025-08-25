import { test, expect } from '@playwright/test';
import path from 'path';

test('copy run link copies to clipboard', async ({ page, context }) => {
  // Grant clipboard permissions for this test
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:3000' });

  // Ensure there is at least one run
  await page.goto('/collections');
  const collName = 'Web FE Test Collection';
  const exists = await page.getByRole('link', { name: collName }).count();
  if (!exists) {
    await page.getByRole('button', { name: 'Upload Collection' }).click();
    const colPath = path.resolve(__dirname, '../..', 'fixtures/postman/simple.collection.json');
    await page.locator('input[type="file"][name="collection"]').setInputFiles(colPath);
    await page.getByRole('button', { name: 'Upload' }).click();
    await expect(page.getByRole('link', { name: collName })).toBeVisible({ timeout: 10000 });
  }
  await page.getByRole('link', { name: collName }).click();
  await page.getByRole('button', { name: 'Run collection' }).click();
  await page.getByRole('button', { name: 'Start Run' }).click();
  await expect(page).toHaveURL(/\/runs\/.+/);

  // Copy run link
  await page.getByRole('button', { name: 'Copy run link' }).click();

  // Verify clipboard
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(/\/runs\/[a-zA-Z0-9_-]+$/);
});
