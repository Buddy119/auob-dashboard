import { test, expect } from '@playwright/test';

test('loads dashboard and shows health card', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Backend Health')).toBeVisible();

  // Health status should render; requires backend at NEXT_PUBLIC_API_BASE_URL (4000 by default)
  const chip = page.getByText(/OK|Loading|Error/);
  await expect(chip).toBeVisible();
});
