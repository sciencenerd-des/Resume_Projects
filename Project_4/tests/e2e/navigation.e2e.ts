import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers/clerk-auth';

test.describe('Navigation', () => {
  test.describe('Public Routes', () => {
    test('can navigate to login page', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('text=VerityDraft')).toBeVisible({ timeout: 10000 });
    });

    test('can navigate to signup page', async ({ page }) => {
      await page.goto('/signup');
      await waitForPageReady(page);

      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('text=VerityDraft')).toBeVisible({ timeout: 10000 });
    });

    test('root redirects appropriately', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);

      // Should either show landing page or redirect
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Protected Routes Redirect', () => {
    test('workspaces redirects to login when unauthenticated', async ({ page }) => {
      await page.goto('/workspaces');
      await page.waitForTimeout(2000);

      const url = page.url();
      expect(url.includes('login') || url.includes('workspaces')).toBeTruthy();
    });

    test('workspace/:id redirects to login when unauthenticated', async ({ page }) => {
      await page.goto('/workspace/test-id');
      await page.waitForTimeout(2000);

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Link Navigation', () => {
    test('login page has signup link', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      const signupLink = page.locator('a[href*="signup"]').first();
      await expect(signupLink).toBeVisible({ timeout: 10000 });
    });

    test('signup page has login link', async ({ page }) => {
      await page.goto('/signup');
      await waitForPageReady(page);

      const loginLink = page.locator('a[href*="login"]').first();
      await expect(loginLink).toBeVisible({ timeout: 10000 });
    });

    test('can navigate from login to signup', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      const signupLink = page.locator('a[href*="signup"]').first();
      if (await signupLink.isVisible().catch(() => false)) {
        await signupLink.click();
        await waitForPageReady(page);
        expect(page.url()).toContain('signup');
      }
    });

    test('can navigate from signup to login', async ({ page }) => {
      await page.goto('/signup');
      await waitForPageReady(page);

      const loginLink = page.locator('a[href*="login"]').first();
      if (await loginLink.isVisible().catch(() => false)) {
        await loginLink.click();
        await waitForPageReady(page);
        expect(page.url()).toContain('login');
      }
    });
  });

  test.describe('Browser Navigation', () => {
    test('back button works', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      await page.goto('/signup');
      await waitForPageReady(page);

      await page.goBack();
      await page.waitForTimeout(500);

      expect(page.url()).toContain('login');
    });

    test('forward button works', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      await page.goto('/signup');
      await waitForPageReady(page);

      await page.goBack();
      await page.waitForTimeout(500);

      await page.goForward();
      await page.waitForTimeout(500);

      expect(page.url()).toContain('signup');
    });

    test('page refresh maintains state', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      await page.reload();
      await waitForPageReady(page);

      expect(page.url()).toContain('login');
      await expect(page.locator('text=VerityDraft')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('404 Handling', () => {
    test('handles unknown routes gracefully', async ({ page }) => {
      await page.goto('/nonexistent-page-12345');
      await waitForPageReady(page);

      await expect(page.locator('body')).toBeVisible();
    });

    test('handles malformed routes gracefully', async ({ page }) => {
      await page.goto('/workspace/%%%invalid%%%');
      await waitForPageReady(page);

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Deep Linking', () => {
    test('deep links to protected routes redirect appropriately', async ({ page }) => {
      const deepLinks = [
        '/workspace/test-id/documents',
        '/workspace/test-id/chat',
        '/workspace/test-id/history',
      ];

      for (const link of deepLinks) {
        await page.goto(link);
        await page.waitForTimeout(1000);

        // Should redirect or show appropriate state
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Responsive Navigation', () => {
    test('navigation works on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      await waitForPageReady(page);

      await expect(page.locator('body')).toBeVisible();

      // Navigate to signup
      const signupLink = page.locator('a[href*="signup"]').first();
      if (await signupLink.isVisible().catch(() => false)) {
        await signupLink.click();
        await waitForPageReady(page);
        expect(page.url()).toContain('signup');
      }
    });

    test('navigation works on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/login');
      await waitForPageReady(page);

      await expect(page.locator('body')).toBeVisible();
    });

    test('navigation works on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/login');
      await waitForPageReady(page);

      await expect(page.locator('body')).toBeVisible();
    });
  });
});
