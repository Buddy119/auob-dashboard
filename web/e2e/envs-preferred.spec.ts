import { test, expect } from '@playwright/test';
import path from 'path';

test('set preferred env and RunDialog preselects it', async ({ page }) => {
  // Ensure collection with env exists (use FE-1 fixtures)
  await page.goto('/collections');
  const hasRow = await page.getByRole('link', { name: 'Web FE Test Collection' }).count();
  if (!hasRow) {
    await page.getByRole('button', { name: 'Upload Collection' }).click();
    const colPath = path.resolve(__dirname, '../..', 'fixtures/postman/simple.collection.json');
    const envPath = path.resolve(__dirname, '../..', 'fixtures/postman/dev.env.json');
    await page.locator('input[type="file"][name="collection"]').setInputFiles(colPath);
    await page.locator('input[type="file"][name="env"]').setInputFiles(envPath);
    await page.getByRole('button', { name: 'Upload' }).click();
    await expect(page.getByRole('link', { name: 'Web FE Test Collection' })).toBeVisible({ timeout: 10000 });
  }

  // Go detail → Environments tab
  await page.getByRole('link', { name: 'Web FE Test Collection' }).click();
  await expect(page.getByRole('heading', { name: 'Web FE Test Collection' })).toBeVisible();
  await page.getByRole('button', { name: 'Environments' }).click();

  // Set preferred
  await page.getByRole('button', { name: /Set preferred|Preferred/ }).first().click(); // toggles for first env
  // Preferred star should appear in table
  await expect(page.getByText('★')).toBeVisible();

  // Run with this env → Start Run → redirected
  await page.getByRole('button', { name: 'Run' }).first().click();
  await page.getByRole('button', { name: 'Start Run' }).click();
  await expect(page).toHaveURL(/\/runs\/.+/);

  // Go back to collection and open header Run dialog; env should be preselected
  await page.getByRole('link', { name: '← Runs' }).click(); // back to /runs
  await page.getByRole('link', { name: '← Back to Collections' }).click().catch(() => {}); // or navigate directly:
  await page.goto('/collections');
  await page.getByRole('link', { name: 'Web FE Test Collection' }).click();

  // Open header "Run collection"
  await page.getByRole('button', { name: 'Run collection' }).click();

  // Assert the selected option text includes the env name ("dev-env")
  const selectedText = await page
    .locator('select[aria-label="Environment"]')
    .evaluate((el: HTMLSelectElement) => el.selectedOptions[0]?.textContent || '');
  expect(selectedText.toLowerCase()).toContain('dev-env');
});
