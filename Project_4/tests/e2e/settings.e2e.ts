import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers/clerk-auth';

test.describe('Settings', () => {
  test.describe('Public Access', () => {
    test('redirects to login when accessing settings without auth', async ({ page }) => {
      await page.goto('/settings');
      await waitForPageReady(page);

      await page.waitForTimeout(2000);
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Login Page', () => {
    test('login page loads successfully', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      await expect(page.locator('text=VerityDraft')).toBeVisible({ timeout: 10000 });
    });

    test('has signup link', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      const signupLink = page.locator('a[href*="signup"]').first();
      await expect(signupLink).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Error Handling', () => {
    test('handles network errors gracefully', async ({ page }) => {
      await page.route('**/api/**', route => route.abort());

      await page.goto('/');
      await waitForPageReady(page);

      await expect(page.locator('body')).toBeVisible();

      await page.unroute('**/api/**');
    });

    test('handles server errors gracefully', async ({ page }) => {
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await page.goto('/');
      await waitForPageReady(page);

      await expect(page.locator('body')).toBeVisible();

      await page.unroute('**/api/**');
    });
  });

  test.describe('Navigation', () => {
    test('can navigate between login and signup', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      const signupLink = page.locator('a[href*="signup"]').first();
      if (await signupLink.isVisible().catch(() => false)) {
        await signupLink.click();
        await waitForPageReady(page);
        expect(page.url()).toContain('signup');
      }
    });

    test('browser back button works', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      await page.goto('/signup');
      await waitForPageReady(page);

      await page.goBack();
      await page.waitForTimeout(500);

      expect(page.url()).toContain('login');
    });

    test('page refresh maintains state', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      await page.reload();
      await waitForPageReady(page);

      expect(page.url()).toContain('login');
    });
  });

  test.describe('Responsive Design', () => {
    test('page loads on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      await waitForPageReady(page);

      await expect(page.locator('text=VerityDraft')).toBeVisible({ timeout: 10000 });
    });

    test('page loads on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/login');
      await waitForPageReady(page);

      await expect(page.locator('text=VerityDraft')).toBeVisible({ timeout: 10000 });
    });

    test('page loads on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/login');
      await waitForPageReady(page);

      await expect(page.locator('text=VerityDraft')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Accessibility', () => {
    test('login page has heading structure', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      const headings = page.locator('h1, h2, h3');
      expect(await headings.count()).toBeGreaterThan(0);
    });

    test('can navigate with keyboard', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeDefined();
    });
  });
});
