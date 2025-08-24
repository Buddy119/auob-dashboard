import { test, expect } from '@playwright/test';
import path from 'path';

test('navigates to detail and toggles critical flag', async ({ page }) => {
  // Ensure a collection exists (upload if needed)
  await page.goto('/collections');

  const hasRow = await page.getByRole('link', { name: 'Web FE Test Collection' }).count();
  if (!hasRow) {
    await page.getByRole('button', { name: 'Upload Collection' }).click();
    const colPath = path.resolve(__dirname, '../fixtures/postman/simple.collection.json');
    await page.locator('input[type="file"][name="collection"]').setInputFiles(colPath);
    await page.getByRole('button', { name: 'Upload', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Web FE Test Collection' })).toBeVisible({ timeout: 10000 });
  }

  // Go to detail
  await page.getByRole('link', { name: 'Web FE Test Collection' }).click();
  await expect(page.getByRole('heading', { name: 'Web FE Test Collection' })).toBeVisible();

  // Requests tab is default; the FE‑1 fixture has one request "List Users"
  // Mark it critical
  const toggleBtn = page.getByRole('button', { name: /Mark critical|Unmark critical/ });
  await toggleBtn.click();

  // After optimistic update, badge should appear
  await expect(page.getByText('CRITICAL')).toBeVisible();

  // Reload to confirm persistence
  await page.reload();
  await expect(page.getByText('CRITICAL')).toBeVisible();

  // Unmark to leave the system clean
  await page.getByRole('button', { name: /Unmark critical/ }).click();
  await expect(page.getByText('CRITICAL')).toHaveCount(0);
});
