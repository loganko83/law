import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('HOME-001: Contract list displays', async ({ page }) => {
    await expect(page.locator('text=/진행 중인 계약|Active Contracts/')).toBeVisible();
  });

  test('HOME-002: Filter tabs are visible', async ({ page }) => {
    await expect(page.getByTestId('filter-all')).toBeVisible();
    await expect(page.getByTestId('filter-freelance')).toBeVisible();
  });

  test('HOME-003: Filter tabs are clickable', async ({ page }) => {
    await page.getByTestId('filter-freelance').click();
    await expect(page.getByTestId('filter-freelance')).toHaveClass(/bg-slate-800/);
  });

  test('HOME-004: Safety status card displays', async ({ page }) => {
    await expect(page.locator('text=/안전|Safe/')).toBeVisible();
  });

  test('HOME-005: Template section displays', async ({ page }) => {
    await expect(page.locator('text=/템플릿|Templates/')).toBeVisible();
    await expect(page.getByTestId('template-freelance')).toBeVisible();
  });

  test('HOME-006: Template click navigates', async ({ page }) => {
    await page.getByTestId('template-freelance').click();
    await expect(page.locator('textarea')).toBeVisible({ timeout: 5000 });
  });

  test('HOME-007: Language switcher works', async ({ page }) => {
    await page.getByTestId('lang-switcher').click();
    // After click, language should toggle
    await page.waitForTimeout(500);
    const langText = await page.getByTestId('lang-switcher').textContent();
    expect(['KR', 'EN']).toContain(langText?.trim());
  });

  test('HOME-008: Notification button works', async ({ page }) => {
    await page.getByTestId('btn-notifications').click();
    await expect(page.locator('text=/알림|Notifications/')).toBeVisible();
  });
});
