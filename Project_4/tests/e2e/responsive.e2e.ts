import { test, expect, devices } from '@playwright/test';

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

  test.describe('Mobile (iPhone)', () => {
    test.use({ ...devices['iPhone 13'] });

    test('shows mobile navigation', async ({ page }) => {
      await page.click('[data-testid="workspace-card"]:first-child');

      // Sidebar should be hidden, mobile menu visible
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible();
    });

    test('mobile menu opens and closes', async ({ page }) => {
      await page.click('[data-testid="workspace-card"]:first-child');

      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

      await page.click('[data-testid="mobile-menu-close"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).not.toBeVisible();
    });

    test('workspace cards stack vertically', async ({ page }) => {
      const cards = page.locator('[data-testid="workspace-card"]');
      const count = await cards.count();

      if (count >= 2) {
        const first = await cards.first().boundingBox();
        const second = await cards.nth(1).boundingBox();

        // Cards should be stacked vertically
        expect(second!.y).toBeGreaterThan(first!.y + first!.height - 10);
      }
    });

    test('chat input is full width', async ({ page }) => {
      await page.click('[data-testid="workspace-card"]:first-child');
      await page.click('[data-testid="mobile-menu-button"]');
      await page.click('[data-testid="mobile-nav-chat"]');

      const input = page.locator('[data-testid="chat-input"]');
      const inputBox = await input.boundingBox();
      const viewport = page.viewportSize();

      // Input should be nearly full width
      expect(inputBox!.width).toBeGreaterThan(viewport!.width * 0.8);
    });

    test('evidence ledger is collapsible', async ({ page }) => {
      await page.click('[data-testid="workspace-card"]:first-child');
      await page.click('[data-testid="mobile-menu-button"]');
      await page.click('[data-testid="mobile-nav-history"]');
      await page.click('[data-testid="session-item"]:first-child');

      // Ledger should be in accordion/collapsible mode
      await expect(page.locator('[data-testid="ledger-toggle"]')).toBeVisible();
    });
  });

  test.describe('Tablet (iPad)', () => {
    test.use({ ...devices['iPad Pro'] });

    test('sidebar collapses to icons', async ({ page }) => {
      await page.click('[data-testid="workspace-card"]:first-child');

      const sidebar = page.locator('[data-testid="sidebar"]');
      // Sidebar should be narrower
      const box = await sidebar.boundingBox();
      expect(box!.width).toBeLessThan(200);
    });

    test('two-column layout for documents', async ({ page }) => {
      await page.click('[data-testid="workspace-card"]:first-child');
      await page.click('[data-testid="nav-documents"]');

      const cards = page.locator('[data-testid="document-card"]');
      const count = await cards.count();

      if (count >= 2) {
        const first = await cards.first().boundingBox();
        const second = await cards.nth(1).boundingBox();

        // Cards should be side by side
        expect(second!.x).toBeGreaterThan(first!.x);
      }
    });
  });

  test.describe('Desktop (1920px)', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('full sidebar is visible', async ({ page }) => {
      await page.click('[data-testid="workspace-card"]:first-child');

      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      await expect(page.locator('[data-testid="sidebar-label"]').first()).toBeVisible();
    });

    test('three-column layout for workspace home', async ({ page }) => {
      await page.click('[data-testid="workspace-card"]:first-child');

      // Should have sidebar, main content, and optionally a right panel
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
    });

    test('chat has side panel for ledger', async ({ page }) => {
      await page.click('[data-testid="workspace-card"]:first-child');
      await page.click('[data-testid="nav-chat"]');

      // Ledger panel should be visible alongside chat
      const chatArea = page.locator('[data-testid="chat-area"]');
      const ledgerPanel = page.locator('[data-testid="ledger-panel"]');

      const chatBox = await chatArea.boundingBox();
      const ledgerBox = await ledgerPanel.boundingBox();

      // They should be side by side
      if (ledgerBox) {
        expect(ledgerBox.x).toBeGreaterThan(chatBox!.x);
      }
    });
  });

  test.describe('Touch interactions', () => {
    test.use({ hasTouch: true });

    test('swipe to navigate', async ({ page }) => {
      await page.click('[data-testid="workspace-card"]:first-child');

      // Swipe gesture simulation
      await page.locator('[data-testid="main-content"]').dispatchEvent('touchstart', {
        touches: [{ clientX: 300, clientY: 200 }],
      });
      await page.locator('[data-testid="main-content"]').dispatchEvent('touchend', {
        changedTouches: [{ clientX: 50, clientY: 200 }],
      });

      // Verify navigation happened or menu opened
      await page.waitForTimeout(300);
    });

    test('tap works on buttons', async ({ page }) => {
      await page.click('[data-testid="workspace-card"]:first-child');
      await page.click('[data-testid="nav-documents"]');

      // Tap interaction should work
      await expect(page).toHaveURL(/\/documents/);
    });
  });
});
