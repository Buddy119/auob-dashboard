import { test, expect } from '@playwright/test';
import path from 'path';

test('upload collection + env and see the new row', async ({ page }) => {
  await page.goto('/collections');

  await page.getByRole('button', { name: 'Upload Collection' }).click();

  const colPath = path.resolve(__dirname, '../fixtures/postman/simple.collection.json');
  const envPath = path.resolve(__dirname, '../fixtures/postman/dev.env.json');
  await page.locator('input[type="file"][name="collection"]').setInputFiles(colPath);
  await page.locator('input[type="file"][name="env"]').setInputFiles(envPath);

  await page.getByRole('button', { name: 'Upload', exact: true }).click();

  await expect(page.getByText('Collection uploaded successfully.')).toBeVisible({ timeout: 5000 });

  await expect(page.getByRole('link', { name: 'Web FE Test Collection' })).toBeVisible({ timeout: 10000 });

  await page.getByPlaceholder('Search collections…').fill('Web FE Test Collection');
  await page.waitForTimeout(500);
  await expect(page.getByRole('link', { name: 'Web FE Test Collection' })).toBeVisible();
});
