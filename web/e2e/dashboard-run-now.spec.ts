import { test, expect } from '@playwright/test';
import path from 'path';

test('dashboard shows collection cards and Run now launches a run', async ({ page }) => {
  // Ensure at least one collection exists
  await page.goto('/collections');
  const has = await page.getByRole('link', { name: 'Web FE Test Collection' }).count();
  if (!has) {
    await page.getByRole('button', { name: 'Upload Collection' }).click();
    const colPath = path.resolve(__dirname, '../..', 'fixtures/postman/simple.collection.json');
    await page.locator('input[type="file"][name="collection"]').setInputFiles(colPath);
    await page.getByRole('button', { name: 'Upload' }).click();
    await expect(page.getByRole('link', { name: 'Web FE Test Collection' })).toBeVisible({ timeout: 10000 });
  }

  // Go to dashboard and see card
  await page.goto('/dashboard');
  const card = page.getByRole('link', { name: 'Web FE Test Collection' });
  await expect(card).toBeVisible({ timeout: 10000 });

  // Click Run now on that card → dialog → Start Run → redirect to /runs/[id]
  // Find the nearest Run now button (assumes first card matches)
  const runNow = page.getByRole('button', { name: 'Run now' }).first();
  await runNow.click();
  await page.getByRole('button', { name: 'Start Run' }).click();
  await expect(page).toHaveURL(/\/runs\/.+/);

  // Basic console appears
  await expect(page.getByText(/Timeline|Assertions/)).toBeVisible({ timeout: 10000 });
});

