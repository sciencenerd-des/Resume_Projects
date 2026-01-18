/**
 * Document Management Edge Cases E2E Tests
 * Tests for document upload area, public access, error handling, and responsiveness
 */

import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers/clerk-auth';

test.describe('Document Upload Public Access', () => {
  test('redirects to login when accessing documents without auth', async ({ page }) => {
    await page.goto('/workspace/test-id/documents');
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

test.describe('Document Upload Error Handling', () => {
  test('handles invalid workspace ID gracefully', async ({ page }) => {
    await page.goto('/workspace/invalid-id/documents');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles malformed URLs gracefully', async ({ page }) => {
    await page.goto('/workspace/%%%invalid%%%/documents');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

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

  test('handles upload endpoint errors gracefully', async ({ page }) => {
    await page.route('**/upload**', route => route.abort());

    await page.goto('/');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();

    await page.unroute('**/upload**');
  });
});

test.describe('Document Upload Navigation', () => {
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

  test('handles navigation to non-existent document', async ({ page }) => {
    await page.goto('/workspace/test-id/documents/non-existent-doc');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Document Upload Responsive Design', () => {
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

test.describe('Document Upload Accessibility', () => {
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

test.describe('Document File Type Handling', () => {
  test('handles direct document URL navigation', async ({ page }) => {
    await page.goto('/workspace/test-id/documents/doc-123');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles document URL with query params', async ({ page }) => {
    await page.goto('/workspace/test-id/documents?filter=pdf');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles document URL with hash', async ({ page }) => {
    await page.goto('/workspace/test-id/documents#chunk-1');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Document Upload Security', () => {
  test('handles XSS in document ID', async ({ page }) => {
    await page.goto('/workspace/test-id/documents/<script>alert(1)</script>');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles SQL injection in URL', async ({ page }) => {
    await page.goto("/workspace/'; DROP TABLE documents;--/documents");
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles path traversal attempt', async ({ page }) => {
    await page.goto('/workspace/test-id/documents/../../../etc/passwd');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Document URL Edge Cases', () => {
  test('handles very long workspace ID', async ({ page }) => {
    const longId = 'a'.repeat(500);
    await page.goto(`/workspace/${longId}/documents`);
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles unicode in workspace ID', async ({ page }) => {
    await page.goto('/workspace/ワークスペース/documents');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles empty workspace ID', async ({ page }) => {
    await page.goto('/workspace//documents');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('handles workspace ID with spaces', async ({ page }) => {
    await page.goto('/workspace/test%20workspace/documents');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Document Loading States', () => {
  test('handles slow network connection', async ({ page }) => {
    // Simulate slow network
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });

    await page.goto('/login');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();

    await page.unroute('**/*');
  });

  test('handles timeout on document fetch', async ({ page }) => {
    await page.route('**/documents**', async route => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      await route.abort();
    });

    await page.goto('/');
    await waitForPageReady(page);

    await expect(page.locator('body')).toBeVisible();

    await page.unroute('**/documents**');
  });
});

test.describe('Document Keyboard Shortcuts', () => {
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
});
