import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('NAV-001: Home page loads correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('SafeContract')).toBeVisible();
    await expect(page.getByTestId('bottom-nav')).toBeVisible();
  });

  test('NAV-002: Bottom nav - Home', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-home').click();
    await expect(page.getByText('SafeContract')).toBeVisible();
  });

  test('NAV-003: Bottom nav - Diagnosis', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-diagnosis').click();
    await expect(page.locator('input[type="file"]')).toBeAttached();
  });

  test('NAV-004: Bottom nav - Legal Services', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-legal').click();
    await expect(page.getByTestId('btn-legal-qa')).toBeVisible();
  });

  test('NAV-005: Bottom nav - Profile', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-profile').click();
    await expect(page.locator('text=/프로필|Profile/')).toBeVisible();
  });
});
