import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Contract Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-diagnosis').click();
  });

  test('UPL-001: Upload page displays', async ({ page }) => {
    await expect(page.locator('input[type="file"]')).toBeAttached();
  });

  test('UPL-002: File upload works', async ({ page }) => {
    // Create a test file
    const testContract = `
용역 계약서
제1조 (목적) 본 계약은 웹 개발 용역에 관한 사항을 정함을 목적으로 한다.
제2조 (계약기간) 2024년 1월 1일부터 2024년 6월 30일까지
제3조 (용역대금) 총 용역대금은 금 50,000,000원으로 한다.
    `.trim();

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-contract.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(testContract, 'utf-8'),
    });

    // Verify file is uploaded
    await expect(page.locator('text=test-contract.txt')).toBeVisible();
  });

  test('UPL-003: Analysis button appears after upload', async ({ page }) => {
    const testContract = `용역 계약서 - 테스트용 계약서 내용입니다. 최소 50자 이상의 내용이 필요합니다.`;

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(testContract, 'utf-8'),
    });

    await expect(page.locator('button:has-text("분석"), button:has-text("시작")')).toBeVisible();
  });
});

test.describe('Analysis Results', () => {
  test.skip('ANL-001: Full analysis flow', async ({ page }) => {
    // This test requires valid API key and takes time
    // Skip in CI, run manually for integration testing
    await page.goto('/');
    await page.getByTestId('nav-diagnosis').click();

    const riskyContract = `
용역 계약서
제1조 본 계약은 갑이 을에게 웹 개발 용역을 의뢰함을 목적으로 한다.
제4조 (지체상금) 지체일수 1일당 계약금액의 3%를 지체상금으로 지급한다.
제5조 (지적재산권) 모든 지적재산권은 갑에게 귀속된다.
제6조 (계약해지) 갑은 언제든지 본 계약을 해지할 수 있다.
제7조 (손해배상) 을은 손해액 전액을 배상하며 제한을 두지 않는다.
    `.trim();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'risky-contract.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(riskyContract, 'utf-8'),
    });

    await page.locator('button:has-text("시작")').click();

    // Wait for analysis (up to 60 seconds)
    await expect(page.locator('text=/점|score/i')).toBeVisible({ timeout: 60000 });
  });
});
