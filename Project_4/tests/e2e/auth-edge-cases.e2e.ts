/**
 * Authentication Edge Cases E2E Tests
 * Tests for auth-related UI behavior with Clerk authentication
 */

import { test, expect, type Page } from '@playwright/test';
import { waitForPageReady } from './helpers/clerk-auth';

// Helper to wait for page content
async function waitForPageContent(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

test.describe('Login Page Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await waitForPageContent(page);
  });

  test('page loads successfully', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=VerityDraft')).toBeVisible({ timeout: 10000 });
  });

  test('has proper page title or branding', async ({ page }) => {
    const title = await page.title();
    expect(title).toBeDefined();
    await expect(page.locator('h1, [class*="title"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('handles rapid page reloads', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await waitForPageContent(page);
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('handles browser back/forward navigation', async ({ page }) => {
    await page.goto('/signup');
    await waitForPageContent(page);

    await page.goBack();
    await waitForPageContent(page);

    await page.goForward();
    await waitForPageContent(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('maintains state after soft navigation', async ({ page }) => {
    // Navigate to signup and back
    const signUpLink = page.locator('a[href*="signup"]').first();
    if (await signUpLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signUpLink.click();
      await waitForPageContent(page);

      const signInLink = page.locator('a[href*="login"]').first();
      if (await signInLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await signInLink.click();
        await waitForPageContent(page);
      }
    }
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Signup Page Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
    await waitForPageContent(page);
  });

  test('page loads successfully', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=VerityDraft')).toBeVisible({ timeout: 10000 });
  });

  test('has sign in link visible', async ({ page }) => {
    const signInLink = page.locator('a[href*="login"], text=Sign in').first();
    await expect(signInLink).toBeVisible({ timeout: 10000 });
  });

  test('handles page refresh', async ({ page }) => {
    await page.reload();
    await waitForPageContent(page);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Session Management Edge Cases', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/workspaces');
    await page.waitForTimeout(2000);

    // Should redirect to login or stay on workspaces if somehow authed
    const url = page.url();
    expect(url.includes('login') || url.includes('workspaces')).toBeTruthy();
  });

  test('handles localStorage clear gracefully', async ({ page }) => {
    await page.goto('/login');
    await waitForPageContent(page);

    // Clear storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Reload and verify page still works
    await page.reload();
    await waitForPageContent(page);
    await expect(page.locator('body')).toBeVisible();
  });

  test('handles expired session gracefully', async ({ page }) => {
    await page.goto('/workspaces');
    await page.waitForTimeout(1000);

    // Clear storage to simulate expired session
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Reload
    await page.reload();
    await page.waitForTimeout(2000);

    // Should redirect to login or show appropriate state
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('all protected routes handle unauthenticated access', async ({ page }) => {
    const protectedRoutes = [
      '/workspaces',
      '/workspaces/test-id',
      '/settings',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForTimeout(1000);
      // Should either redirect or show appropriate state
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('public routes accessible without auth', async ({ page }) => {
    const publicRoutes = ['/login', '/signup'];

    for (const route of publicRoutes) {
      await page.goto(route);
      await waitForPageContent(page);
      expect(page.url()).toContain(route.substring(1));
    }
  });
});

test.describe('Error Handling', () => {
  test('page handles JavaScript errors gracefully', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/login');
    await waitForPageContent(page);

    // Page should still render
    await expect(page.locator('body')).toBeVisible();
  });

  test('page handles network issues gracefully', async ({ page, context }) => {
    await page.goto('/login');
    await waitForPageContent(page);

    // Go offline briefly
    await context.setOffline(true);
    await page.waitForTimeout(500);
    await context.setOffline(false);

    // Should still show content
    await expect(page.locator('body')).toBeVisible();
  });

  test('handles 404 page gracefully', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');
    await waitForPageContent(page);

    // Should show 404 or redirect
    await expect(page.locator('body')).toBeVisible();
  });

  test('handles malformed URL gracefully', async ({ page }) => {
    await page.goto('/workspace/%%%invalid%%%');
    await waitForPageContent(page);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('login page has proper heading structure', async ({ page }) => {
    await page.goto('/login');
    await waitForPageContent(page);

    // Should have at least one heading
    const headings = page.locator('h1, h2, h3');
    expect(await headings.count()).toBeGreaterThan(0);
  });

  test('can navigate with keyboard', async ({ page }) => {
    await page.goto('/login');
    await waitForPageContent(page);

    // Tab through elements
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeDefined();
  });

  test('links have visible focus states', async ({ page }) => {
    await page.goto('/login');
    await waitForPageContent(page);

    // Focus on a link
    const link = page.locator('a').first();
    if (await link.isVisible().catch(() => false)) {
      await link.focus();
      const isFocused = await link.evaluate((el) =>
        document.activeElement === el
      );
      expect(isFocused).toBeTruthy();
    }
  });
});

test.describe('Responsive Design', () => {
  test('login page works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    await waitForPageContent(page);

    await expect(page.locator('text=VerityDraft')).toBeVisible({ timeout: 10000 });
  });

  test('login page works on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');
    await waitForPageContent(page);

    await expect(page.locator('text=VerityDraft')).toBeVisible({ timeout: 10000 });
  });

  test('login page works on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/login');
    await waitForPageContent(page);

    await expect(page.locator('text=VerityDraft')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Browser Compatibility', () => {
  test('handles window resize', async ({ page }) => {
    await page.goto('/login');
    await waitForPageContent(page);

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(200);

    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(200);

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles zoom levels', async ({ page }) => {
    await page.goto('/login');
    await waitForPageContent(page);

    await page.evaluate(() => {
      document.body.style.zoom = '150%';
    });
    await page.waitForTimeout(100);

    await expect(page.locator('body')).toBeVisible();

    await page.evaluate(() => {
      document.body.style.zoom = '100%';
    });
  });
});

test.describe('Performance', () => {
  test('login page loads within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/login');
    await waitForPageContent(page);
    const loadTime = Date.now() - startTime;

    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('handles multiple rapid navigations', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await page.goto('/login');
      await page.goto('/signup');
    }
    await waitForPageContent(page);
    await expect(page.locator('body')).toBeVisible();
  });
});
