import { test, expect } from '@playwright/test';
import { analyze } from '@axe-core/playwright';
import path from 'path';

test('skip link, shortcuts, and axe scan on key pages', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:3000' });

  // Ensure a collection exists
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

  // Axe on dashboard
  await page.goto('/dashboard');
  const results = await analyze(page, { rules: { 'color-contrast': { enabled: false } } }); // allow for theme variance
  expect(results.violations).toEqual([]);

  // Skip link works
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#content')).toBeFocused();

  // Collections shortcuts: 'u' opens dialog, 'esc' closes, '/' focuses search
  await page.goto('/collections');
  await page.keyboard.press('u');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('/');
  await expect(page.locator('#collections-search')).toBeFocused();

  // Collection detail: 'r' opens Run dialog and focuses env select
  await page.getByRole('link', { name: collName }).click();
  await expect(page.getByRole('heading', { name: collName })).toBeVisible();
  await page.keyboard.press('r');
  await expect(page.getByRole('dialog')).toBeVisible();
  // select should be focused due to autoFocus + dialog focus
  await expect(page.locator('select[aria-label="Environment"]')).toBeFocused();
  await page.keyboard.press('Escape');

  // Start a run quickly and test timeline navigation keys
  await page.keyboard.press('r');
  await page.getByRole('button', { name: 'Start Run' }).click();
  await expect(page).toHaveURL(/\/runs\/.+/);

  // Wait for at least one timeline item
  await expect(page.getByRole('heading', { name: 'Timeline' })).toBeVisible();
  await expect(page.locator('#timeline-list')).toBeVisible({ timeout: 15000 });
  // Focus list and use arrows
  await page.locator('#timeline-list').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  // 'a' focuses assertions panel
  await page.keyboard.press('a');
  await expect(page.locator('#assertions-panel')).toBeFocused();
});
