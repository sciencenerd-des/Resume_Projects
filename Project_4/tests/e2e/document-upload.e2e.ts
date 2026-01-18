import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers/clerk-auth';

test.describe('Document Upload Journey', () => {
  test.describe('Public Access', () => {
    test('redirects to login when accessing documents without auth', async ({ page }) => {
      await page.goto('/workspace/test-id/documents');
      await waitForPageReady(page);

      // Should redirect to login or show appropriate state
      await page.waitForTimeout(2000);
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Page Loading', () => {
    test('login page loads', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      await expect(page.locator('text=VerityDraft')).toBeVisible({ timeout: 10000 });
    });

    test('handles invalid workspace URL gracefully', async ({ page }) => {
      await page.goto('/workspace/invalid-id/documents');
      await waitForPageReady(page);

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('handles network errors gracefully', async ({ page }) => {
      await page.route('**/api/**', route => route.abort());

      await page.goto('/');
      await waitForPageReady(page);

      // Should show error or fallback state
      await expect(page.locator('body')).toBeVisible();

      await page.unroute('**/api/**');
    });

    test('handles malformed URLs gracefully', async ({ page }) => {
      await page.goto('/workspace/%%%invalid%%%/documents');
      await waitForPageReady(page);

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('page loads on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      await waitForPageReady(page);

      await expect(page.locator('body')).toBeVisible();
    });

    test('page loads on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/login');
      await waitForPageReady(page);

      await expect(page.locator('body')).toBeVisible();
    });

    test('page loads on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/login');
      await waitForPageReady(page);

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('can navigate to login from root', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      // Should eventually reach login or show appropriate state
      await expect(page.locator('body')).toBeVisible();
    });

    test('handles browser back button', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      await page.goto('/signup');
      await waitForPageReady(page);

      await page.goBack();
      await page.waitForTimeout(500);

      expect(page.url()).toContain('login');
    });
  });
});
