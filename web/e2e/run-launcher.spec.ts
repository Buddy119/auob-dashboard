import { test, expect } from '@playwright/test';
import path from 'path';

test('from collection detail → open dialog → start run → redirect to run page', async ({ page }) => {
  // Ensure we have a collection; reuse FE-1 fixture if needed
  await page.goto('/collections');
  const exists = await page.getByRole('link', { name: 'Web FE Test Collection' }).count();
  if (!exists) {
    await page.getByRole('button', { name: 'Upload Collection' }).click();
    const colPath = path.resolve(__dirname, '../fixtures/postman/simple.collection.json');
    await page.locator('input[type="file"][name="collection"]').setInputFiles(colPath);
    await page.getByRole('button', { name: 'Upload', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Web FE Test Collection' })).toBeVisible({ timeout: 10000 });
  }

  // Go to detail
  await page.getByRole('link', { name: 'Web FE Test Collection' }).click();
  await expect(page.getByRole('heading', { name: 'Web FE Test Collection' })).toBeVisible();

  // Open Run dialog and start
  await page.getByRole('button', { name: 'Run collection' }).click();
  // Fill a tiny delay and maxDuration to complete quickly
  const delay = page.locator('input[type="number"]').nth(1);
  await delay.fill('10');
  const maxDur = page.getByPlaceholder('(optional)');
  await maxDur.fill('800');

  await page.getByRole('button', { name: 'Start Run' }).click();

  // Should redirect to /runs/[runId]
  await expect(page).toHaveURL(/\/runs\/.+/);

  // The run page shows status chip and basic fields
  await expect(page.getByText(/Run #/)).toBeVisible();
  await expect(page.getByText(/Status|Health|Total|P95|Created/)).toBeVisible({ timeout: 5000 });

  // Wait for the page to show any terminal or running status (depends on your backend)
  await expect(page.locator('span').filter({ hasText: /(queued|running|success|partial|timeout|error|cancelled)/ }))
    .toBeVisible({ timeout: 15000 });
});
