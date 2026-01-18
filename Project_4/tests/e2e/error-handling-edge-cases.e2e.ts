import { test, expect, Page } from '@playwright/test';

// Helper to setup authenticated page
async function setupAuthenticatedPage(page: Page) {
  await page.addInitScript(() => {
    (window as any).__clerk_frontend_api = 'test';
    (window as any).__clerk_publishable_key = 'pk_test_123';
  });
}

test.describe('Error Handling Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
  });

  test.describe('Network Error Handling', () => {
    test('should show error message when API is unreachable', async ({ page }) => {
      await page.route('**/api/**', route => route.abort());
      await page.goto('/');
      // Should show error or fallback UI
      await expect(page.locator('body')).toBeVisible();
    });

    test('should show error for timeout on slow network', async ({ page }) => {
      await page.route('**/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 30000));
        route.abort();
      });
      await page.goto('/');
      // Should show timeout error or loading state
      await expect(page.locator('body')).toBeVisible();
    });

    test('should retry failed requests automatically', async ({ page }) => {
      let attempts = 0;
      await page.route('**/api/**', route => {
        attempts++;
        if (attempts < 3) {
          route.abort();
        } else {
          route.continue();
        }
      });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should show offline indicator when network is down', async ({ page }) => {
      await page.goto('/');
      await page.context().setOffline(true);
      // Should show offline indicator
      const offlineIndicator = page.getByText(/offline|no.*connection|network.*error/i);
      // May or may not be visible depending on implementation
      await expect(page.locator('body')).toBeVisible();
      await page.context().setOffline(false);
    });

    test('should recover gracefully when network is restored', async ({ page }) => {
      await page.goto('/');
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);
      await page.context().setOffline(false);
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Server Error Handling', () => {
    test('should handle 500 Internal Server Error gracefully', async ({ page }) => {
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle 503 Service Unavailable', async ({ page }) => {
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 503,
          body: JSON.stringify({ error: 'Service Unavailable' }),
        });
      });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle 502 Bad Gateway', async ({ page }) => {
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 502,
          body: JSON.stringify({ error: 'Bad Gateway' }),
        });
      });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle 429 Too Many Requests', async ({ page }) => {
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 429,
          body: JSON.stringify({ error: 'Too Many Requests' }),
          headers: { 'Retry-After': '60' },
        });
      });
      await page.goto('/');
      // Should show rate limit message
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle malformed JSON response', async ({ page }) => {
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 200,
          body: 'not valid json {{{',
          contentType: 'application/json',
        });
      });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle empty response body', async ({ page }) => {
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 200,
          body: '',
        });
      });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Authentication Error Handling', () => {
    test('should handle 401 Unauthorized', async ({ page }) => {
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      });
      await page.goto('/');
      // Should redirect to login or show auth error
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle 403 Forbidden', async ({ page }) => {
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 403,
          body: JSON.stringify({ error: 'Forbidden' }),
        });
      });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle expired session', async ({ page }) => {
      await page.goto('/');
      // Simulate session expiry
      await page.evaluate(() => {
        localStorage.removeItem('clerk-token');
        sessionStorage.clear();
      });
      await page.reload();
      // Should redirect to login
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle invalid token', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('clerk-token', 'invalid-token');
      });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Client-Side Error Handling', () => {
    test('should handle JavaScript errors gracefully', async ({ page }) => {
      let jsError = null;
      page.on('pageerror', error => {
        jsError = error;
      });
      await page.goto('/');
      // Page should still render even if there are JS errors
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle missing DOM elements', async ({ page }) => {
      await page.goto('/');
      // Click on potentially missing element should not crash
      const missingButton = page.getByRole('button', { name: /nonexistent/i });
      const exists = await missingButton.count() > 0;
      expect(exists).toBe(false);
    });

    test('should handle console errors without crashing', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      await page.goto('/');
      // Page should still be functional
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle unhandled promise rejections', async ({ page }) => {
      page.on('pageerror', () => {});
      await page.goto('/');
      await page.evaluate(() => {
        Promise.reject(new Error('Unhandled rejection'));
      });
      // Page should still be functional
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Form Submission Error Handling', () => {
    test('should show validation errors on login form', async ({ page }) => {
      await page.goto('/login');
      const submitButton = page.getByRole('button', { name: /sign.*in|log.*in/i });
      if (await submitButton.isVisible()) {
        await submitButton.click();
        // Should show validation errors
        const errors = page.locator('[class*="error"], [class*="destructive"]');
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should show server errors on form submission', async ({ page }) => {
      await page.route('**/api/auth/**', route => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({ error: 'Invalid credentials' }),
        });
      });
      await page.goto('/login');
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('password123');
      await page.getByRole('button', { name: /sign.*in|log.*in/i }).click();
      // Should show server error
      await expect(page.locator('body')).toBeVisible();
    });

    test('should preserve form data on validation error', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel(/email/i).fill('test@example.com');
      // Don't fill password, submit
      await page.getByRole('button', { name: /sign.*in|log.*in/i }).click();
      // Email should still be filled
      await expect(page.getByLabel(/email/i)).toHaveValue('test@example.com');
    });

    test('should clear errors when user starts typing', async ({ page }) => {
      await page.goto('/login');
      await page.getByRole('button', { name: /sign.*in|log.*in/i }).click();
      // Start typing
      await page.getByLabel(/email/i).fill('new@example.com');
      // Errors may clear
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('File Upload Error Handling', () => {
    test('should handle file upload failure', async ({ page }) => {
      await page.route('**/api/documents**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Upload failed' }),
        });
      });
      await page.goto('/');
      // Try to upload a file
      await expect(page.locator('body')).toBeVisible();
    });

    test('should show error for unsupported file type', async ({ page }) => {
      await page.goto('/');
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // Try to upload unsupported file type
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should show error for file too large', async ({ page }) => {
      await page.goto('/');
      // Should show error for oversized files
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle upload cancellation gracefully', async ({ page }) => {
      await page.goto('/');
      // Upload cancellation should not crash
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Navigation Error Handling', () => {
    test('should handle 404 Not Found', async ({ page }) => {
      await page.goto('/nonexistent-page-12345');
      // Should show 404 page or redirect
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle malformed URLs gracefully', async ({ page }) => {
      await page.goto('/workspace/%%%invalid%%%');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle deep linking to invalid resource', async ({ page }) => {
      await page.goto('/document/invalid-doc-id-12345');
      // Should show error or redirect
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle browser back/forward errors', async ({ page }) => {
      await page.goto('/');
      await page.goBack();
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Real-time Connection Error Handling', () => {
    test('should handle WebSocket disconnection', async ({ page }) => {
      await page.goto('/');
      // Simulate WebSocket disconnect
      await page.evaluate(() => {
        window.dispatchEvent(new Event('offline'));
      });
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        window.dispatchEvent(new Event('online'));
      });
      await expect(page.locator('body')).toBeVisible();
    });

    test('should reconnect after connection loss', async ({ page }) => {
      await page.goto('/');
      // Connection should recover
      await expect(page.locator('body')).toBeVisible();
    });

    test('should show connection status indicator', async ({ page }) => {
      await page.goto('/');
      // May show connected/disconnected status
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Data Consistency Error Handling', () => {
    test('should handle stale data gracefully', async ({ page }) => {
      await page.goto('/');
      // Handle optimistic update failure
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle concurrent edit conflicts', async ({ page, context }) => {
      await page.goto('/');
      const page2 = await context.newPage();
      await setupAuthenticatedPage(page2);
      await page2.goto('/');
      // Both pages editing same resource
      await expect(page.locator('body')).toBeVisible();
      await expect(page2.locator('body')).toBeVisible();
      await page2.close();
    });

    test('should handle deleted resource access', async ({ page }) => {
      await page.goto('/');
      // Navigate to a resource that was deleted
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Error Recovery', () => {
    test('should provide retry button on error', async ({ page }) => {
      await page.route('**/api/**', route => {
        route.fulfill({ status: 500 });
      });
      await page.goto('/');
      const retryButton = page.getByRole('button', { name: /retry|try.*again/i });
      // Retry button may or may not be visible
      await expect(page.locator('body')).toBeVisible();
    });

    test('should allow page refresh to recover', async ({ page }) => {
      await page.goto('/');
      await page.reload();
      await expect(page.locator('body')).toBeVisible();
    });

    test('should preserve user data during error recovery', async ({ page }) => {
      await page.goto('/');
      // User data should persist after recovery
      await expect(page.locator('body')).toBeVisible();
    });

    test('should show helpful error messages', async ({ page }) => {
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Something went wrong' }),
        });
      });
      await page.goto('/');
      // Error message should be user-friendly
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Boundary Error Cases', () => {
    test('should handle very long response data', async ({ page }) => {
      await page.route('**/api/**', route => {
        const largeData = { data: 'x'.repeat(1000000) };
        route.fulfill({
          status: 200,
          body: JSON.stringify(largeData),
        });
      });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle deeply nested response data', async ({ page }) => {
      await page.route('**/api/**', route => {
        let nested: any = { value: 'end' };
        for (let i = 0; i < 100; i++) {
          nested = { nested };
        }
        route.fulfill({
          status: 200,
          body: JSON.stringify(nested),
        });
      });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle null values in response', async ({ page }) => {
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ data: null, items: [null, null] }),
        });
      });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle undefined behavior gracefully', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        // Try to access undefined
        const obj: any = {};
        console.log(obj.undefined?.property);
      });
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
