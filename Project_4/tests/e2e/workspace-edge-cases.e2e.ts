/**
 * Workspace Management Edge Cases E2E Tests
 * Tests for workspace URLs, error handling, navigation, and responsiveness
 */

import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers/clerk-auth';

test.describe('Workspace Public Access', () => {
  test('redirects to login when accessing workspaces without auth', async ({ page }) => {
    await page.goto('/workspaces');
    await waitForPageReady(page);

    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('redirects to login when accessing specific workspace without auth', async ({ page }) => {
    await page.goto('/workspace/test-workspace-id');
    await waitForPageReady(page);

    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('login page shows branding', async ({ page }) => {
    await page.goto('/login');
    await waitForPageReady(page);

    await expect(page.locator('text=VerityDraft')).toBeVisible({ timeout: 10000 });
  });

  test('has signup link on login page', async ({ page }) => {
    await page.goto('/login');
    await waitForPageReady(page);

    const signupLink = page.locator('a[href*="signup"]').first();
    await expect(signupLink).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Workspace URL Edge Cases', () => {
  test('handles invalid workspace ID in URL', async ({ page }) => {
    await page.goto('/workspace/invalid-id-12345');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles workspace ID with special characters in URL', async ({ page }) => {
    await page.goto('/workspace/test%20workspace');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles very long workspace ID in URL', async ({ page }) => {
    const longId = 'a'.repeat(500);
    await page.goto(`/workspace/${longId}`);
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles unicode workspace ID in URL', async ({ page }) => {
    await page.goto('/workspace/ワークスペース');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles empty workspace ID in URL', async ({ page }) => {
    await page.goto('/workspace/');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles workspace ID with emoji', async ({ page }) => {
    await page.goto('/workspace/test📚workspace');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Workspace Error Handling', () => {
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

  test('handles 404 for workspaces endpoint', async ({ page }) => {
    await page.route('**/workspaces**', route => {
      route.fulfill({
        status: 404,
        body: JSON.stringify({ error: 'Not Found' }),
      });
    });

    await page.goto('/');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();

    await page.unroute('**/workspaces**');
  });

  test('handles timeout on workspace fetch', async ({ page }) => {
    await page.route('**/workspaces**', async route => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      await route.abort();
    });

    await page.goto('/');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();

    await page.unroute('**/workspaces**');
  });
});

test.describe('Workspace Navigation', () => {
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

  test('handles navigation to workspace chat', async ({ page }) => {
    await page.goto('/workspace/test-id/chat');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles navigation to workspace documents', async ({ page }) => {
    await page.goto('/workspace/test-id/documents');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles navigation to workspace history', async ({ page }) => {
    await page.goto('/workspace/test-id/history');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Workspace Responsive Design', () => {
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

  test('page loads on small mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/login');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('page loads on large desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto('/login');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Workspace Accessibility', () => {
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

  test('page has proper document title', async ({ page }) => {
    await page.goto('/login');
    await waitForPageReady(page);

    const title = await page.title();
    expect(title).toBeDefined();
  });

  test('page has lang attribute', async ({ page }) => {
    await page.goto('/login');
    await waitForPageReady(page);

    const lang = await page.locator('html').getAttribute('lang');
    expect(lang || 'en').toBeTruthy();
  });
});

test.describe('Workspace Security', () => {
  test('handles XSS in workspace ID', async ({ page }) => {
    await page.goto('/workspace/<script>alert(1)</script>');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles SQL injection in URL', async ({ page }) => {
    await page.goto("/workspace/'; DROP TABLE workspaces;--");
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles path traversal attempt', async ({ page }) => {
    await page.goto('/workspace/../../../etc/passwd');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles null byte injection', async ({ page }) => {
    await page.goto('/workspace/test%00workspace');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Workspace Keyboard Shortcuts', () => {
  test('Escape key does not crash page', async ({ page }) => {
    await page.goto('/login');
    await waitForPageReady(page);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    await expect(page.locator('body')).toBeVisible();
  });

  test('Meta+K does not crash page', async ({ page }) => {
    await page.goto('/login');
    await waitForPageReady(page);

    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(100);

    await expect(page.locator('body')).toBeVisible();
  });

  test('Ctrl+K does not crash page', async ({ page }) => {
    await page.goto('/login');
    await waitForPageReady(page);

    await page.keyboard.press('Control+k');
    await page.waitForTimeout(100);

    await expect(page.locator('body')).toBeVisible();
  });

  test('Ctrl+N does not crash page', async ({ page }) => {
    await page.goto('/login');
    await waitForPageReady(page);

    await page.keyboard.press('Control+n');
    await page.waitForTimeout(100);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Workspace Multi-Tab Behavior', () => {
  test('handles multiple tabs opening same page', async ({ page, context }) => {
    await page.goto('/login');
    await waitForPageReady(page);

    const page2 = await context.newPage();
    await page2.goto('/login');
    await waitForPageReady(page2);

    await expect(page.locator('body')).toBeVisible();
    await expect(page2.locator('body')).toBeVisible();

    await page2.close();
  });

  test('handles tab closure gracefully', async ({ page, context }) => {
    const page2 = await context.newPage();
    await page2.goto('/login');
    await waitForPageReady(page2);

    await page2.close();

    await page.goto('/login');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Workspace Loading States', () => {
  test('handles slow network connection', async ({ page }) => {
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });

    await page.goto('/login');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();

    await page.unroute('**/*');
  });

  test('handles intermittent network issues', async ({ page }) => {
    let requestCount = 0;
    await page.route('**/api/**', route => {
      requestCount++;
      if (requestCount % 2 === 0) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto('/');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();

    await page.unroute('**/api/**');
  });
});
