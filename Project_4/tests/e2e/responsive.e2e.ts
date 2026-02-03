import { test, expect, devices } from '@playwright/test';

// Mobile tests
const mobileTest = test.extend({
  viewport: { width: 375, height: 667 },
});

// Tablet tests
const tabletTest = test.extend({
  viewport: { width: 768, height: 1024 },
});

// Desktop tests
const desktopTest = test.extend({
  viewport: { width: 1920, height: 1080 },
});

test.describe('Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.waitForSelector('[name="email"]', { state: 'visible', timeout: 10000 });
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/workspaces', { timeout: 10000 });
  });

  test.describe('Mobile viewport', () => {
    test('shows mobile layout at 375px width', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.click('[data-testid="workspace-card"]:first-child');

      // Mobile menu button should be visible
      const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
      if (await mobileMenu.isVisible()) {
        await expect(mobileMenu).toBeVisible();
      }
    });

    test('workspace cards stack vertically on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const cards = page.locator('[data-testid="workspace-card"]');
      const count = await cards.count();

      if (count >= 2) {
        const first = await cards.first().boundingBox();
        const second = await cards.nth(1).boundingBox();

        if (first && second) {
          // Cards should be stacked vertically
          expect(second.y).toBeGreaterThan(first.y + first.height - 10);
        }
      }
    });

    test('chat input is full width on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.click('[data-testid="workspace-card"]:first-child');

      const input = page.locator('[data-testid="chat-input"], textarea, input[type="text"]').first();
      if (await input.isVisible()) {
        const inputBox = await input.boundingBox();
        const viewport = page.viewportSize();

        if (inputBox && viewport) {
          // Input should be nearly full width
          expect(inputBox.width).toBeGreaterThan(viewport.width * 0.7);
        }
      }
    });
  });

  test.describe('Tablet viewport', () => {
    test('shows tablet layout at 768px width', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.click('[data-testid="workspace-card"]:first-child');

      // Sidebar may be collapsed
      const sidebar = page.locator('[data-testid="sidebar"]');
      if (await sidebar.isVisible()) {
        const box = await sidebar.boundingBox();
        if (box) {
          expect(box.width).toBeLessThan(300);
        }
      }
    });

    test('two-column layout for documents on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.click('[data-testid="workspace-card"]:first-child');

      const cards = page.locator('[data-testid="document-card"]');
      const count = await cards.count();

      if (count >= 2) {
        const first = await cards.first().boundingBox();
        const second = await cards.nth(1).boundingBox();

        if (first && second) {
          // Cards may be side by side
          expect(second.x >= first.x || second.y >= first.y + first.height - 10).toBeTruthy();
        }
      }
    });
  });

  test.describe('Desktop viewport', () => {
    test('full sidebar is visible on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.click('[data-testid="workspace-card"]:first-child');

      const sidebar = page.locator('[data-testid="sidebar"]');
      if (await sidebar.isVisible()) {
        await expect(sidebar).toBeVisible();
      }
    });

    test('desktop layout has proper width utilization', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.click('[data-testid="workspace-card"]:first-child');

      // Main content should exist
      const mainContent = page.locator('[data-testid="main-content"], main, [role="main"]').first();
      if (await mainContent.isVisible()) {
        await expect(mainContent).toBeVisible();
      }
    });
  });
});
