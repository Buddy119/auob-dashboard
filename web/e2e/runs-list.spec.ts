import { test, expect } from '@playwright/test';
import path from 'path';

/** Ensures there is at least one run for a known collection; creates it if needed */
async function ensureRunFor(page, name: string) {
  await page.goto('/collections');
  const exists = await page.getByRole('link', { name }).count();
  if (!exists) {
    await page.getByRole('button', { name: 'Upload Collection' }).click();
    const colPath = path.resolve(__dirname, '../..', 'fixtures/postman/simple.collection.json');
    await page.locator('input[type="file"][name="collection"]').setInputFiles(colPath);
    await page.getByRole('button', { name: 'Upload' }).click();
    await expect(page.getByRole('link', { name })).toBeVisible({ timeout: 10000 });
  }

  // Start one run (no env needed for the simple fixture; it calls example.com so it may end up partial)
  await page.getByRole('link', { name }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await page.getByRole('button', { name: 'Run collection' }).click();
  await page.getByRole('button', { name: 'Start Run' }).click();
  await expect(page).toHaveURL(/\/runs\/.+/);
}

test('filters by collection and navigates to a run', async ({ page }) => {
  const collName = 'Web FE Test Collection';
  await ensureRunFor(page, collName);

  // Go to runs
  await page.goto('/runs');

  // Open collection autocomplete and pick our collection
  await page.getByPlaceholder(/Filter by collection/).click();
  // If the selected label is shown, clear to show the menu
  await page.getByPlaceholder(/Filter by collection|Selected:/).fill(collName.slice(0, 6));
  await expect(page.getByText(collName)).toBeVisible();
  await page.getByText(collName, { exact: true }).click();

  // Table should have at least one row for that collection
  const row = page.getByRole('link', { name: /^[a-z0-9]{8}$/ }); // run id short
  await expect(row).toBeVisible({ timeout: 10000 });

  // Click the first run id, it should navigate to the run console
  await row.first().click();
  await expect(page).toHaveURL(/\/runs\/.+/);
  await expect(page.getByText(/Timeline|Assertions/)).toBeVisible();
});
