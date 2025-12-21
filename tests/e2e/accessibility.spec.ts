import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('A11Y-001: All buttons meet 44px touch target', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const buttons = await page.locator('button').all();
    const issues: string[] = [];

    for (const button of buttons) {
      const box = await button.boundingBox();
      if (box && (box.width < 44 || box.height < 44)) {
        const text = await button.textContent();
        issues.push(`Button "${text?.trim().substring(0, 20)}": ${Math.round(box.width)}x${Math.round(box.height)}px`);
      }
    }

    expect(issues, `Touch target issues: ${issues.join(', ')}`).toHaveLength(0);
  });

  test('A11Y-002: Interactive elements have testids', async ({ page }) => {
    await page.goto('/');

    // Check key interactive elements have testids
    await expect(page.getByTestId('nav-home')).toBeAttached();
    await expect(page.getByTestId('nav-diagnosis')).toBeAttached();
    await expect(page.getByTestId('nav-legal')).toBeAttached();
    await expect(page.getByTestId('nav-profile')).toBeAttached();
    await expect(page.getByTestId('lang-switcher')).toBeAttached();
    await expect(page.getByTestId('btn-notifications')).toBeAttached();
  });

  test('A11Y-003: Filter buttons have testids', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('filter-all')).toBeAttached();
    await expect(page.getByTestId('filter-freelance')).toBeAttached();
  });

  test('A11Y-004: Language switcher has aria-label', async ({ page }) => {
    await page.goto('/');

    const langSwitcher = page.getByTestId('lang-switcher');
    await expect(langSwitcher).toHaveAttribute('aria-label', /Switch language/);
  });
});
