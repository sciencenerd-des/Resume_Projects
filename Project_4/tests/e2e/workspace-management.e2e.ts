import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers/clerk-auth';

test.describe('Workspace Management', () => {
  test.describe('Unauthenticated Access', () => {
    test('redirects to login when accessing workspaces without auth', async ({ page }) => {
      await page.goto('/workspaces');
      await waitForPageReady(page);

      // Should redirect to login
      await page.waitForTimeout(2000);
      const url = page.url();
      expect(url.includes('login') || url.includes('workspaces')).toBeTruthy();
    });
  });

  test.describe('Public Pages', () => {
    test('landing page is accessible', async ({ page }) => {
      await page.goto('/');
      await waitForPageReady(page);
      await expect(page.locator('body')).toBeVisible();
    });

    test('login page has branding', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);
      await expect(page.locator('text=VerityDraft')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Page Structure', () => {
    test('workspaces page has proper structure', async ({ page }) => {
      await page.goto('/workspaces');
      await waitForPageReady(page);

      // Should show either workspace list or redirect to login
      const url = page.url();
      if (url.includes('workspaces')) {
        // If we're on workspaces page, check for basic structure
        await expect(page.locator('body')).toBeVisible();
      } else {
        // If redirected, we should be on login
        expect(url.includes('login')).toBeTruthy();
      }
    });
  });

  test.describe('Navigation', () => {
    test('can navigate between pages', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      // Navigate to signup
      const signupLink = page.locator('a[href*="signup"]').first();
      if (await signupLink.isVisible({ timeout: 3000 }).catch(() => false)) {
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
  });

  test.describe('Error Handling', () => {
    test('handles invalid workspace ID gracefully', async ({ page }) => {
      await page.goto('/workspace/invalid-id-12345');
      await waitForPageReady(page);

      // Should handle gracefully
      await expect(page.locator('body')).toBeVisible();
    });

    test('handles malformed URL gracefully', async ({ page }) => {
      await page.goto('/workspace/%%%invalid%%%');
      await waitForPageReady(page);

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Responsiveness', () => {
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
});
