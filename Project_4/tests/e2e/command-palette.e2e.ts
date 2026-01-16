import { test, expect } from '@playwright/test';

test.describe('Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    // Log in and navigate to workspace
    await page.goto('/login');
    await page.waitForSelector('[name="email"]', { state: 'visible', timeout: 10000 });
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/workspaces', { timeout: 10000 });
    await page.click('[data-testid="workspace-card"]:first-child');
  });

  test('opens with keyboard shortcut ⌘K', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();
  });

  test('opens with Ctrl+K on non-Mac', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();
  });

  test('closes with Escape key', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="command-palette"]')).not.toBeVisible();
  });

  test('closes when clicking outside', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();

    await page.click('[data-testid="command-overlay"]');
    await expect(page.locator('[data-testid="command-palette"]')).not.toBeVisible();
  });

  test('displays commands grouped by category', async ({ page }) => {
    await page.keyboard.press('Meta+k');

    await expect(page.locator('text=Actions')).toBeVisible();
    await expect(page.locator('text=Navigation')).toBeVisible();
  });

  test('shows New Chat command', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    await expect(page.locator('text=New Chat')).toBeVisible();
  });

  test('shows Upload Document command', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    await expect(page.locator('text=Upload Document')).toBeVisible();
  });

  test('filters commands by search', async ({ page }) => {
    await page.keyboard.press('Meta+k');

    await page.fill('[placeholder*="Search"]', 'upload');

    await expect(page.locator('text=Upload Document')).toBeVisible();
    await expect(page.locator('text=New Chat')).not.toBeVisible();
  });

  test('shows no results message', async ({ page }) => {
    await page.keyboard.press('Meta+k');

    await page.fill('[placeholder*="Search"]', 'zzzzzzz');

    await expect(page.locator('text=No results')).toBeVisible();
  });

  test('keyboard navigation with arrow keys', async ({ page }) => {
    await page.keyboard.press('Meta+k');

    // Navigate down
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');

    // Verify selection moved
    const selected = page.locator('[data-selected="true"]');
    await expect(selected).toBeVisible();
  });

  test('selects command with Enter', async ({ page }) => {
    await page.keyboard.press('Meta+k');

    // Navigate to New Chat
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Verify command palette closes
    await expect(page.locator('[data-testid="command-palette"]')).not.toBeVisible();
  });

  test('executes New Chat command', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    await page.click('text=New Chat');

    // Verify navigation to chat
    await expect(page).toHaveURL(/\/chat/);
  });

  test('executes Upload Document command', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    await page.click('text=Upload Document');

    // Verify file input becomes active or modal opens
    await expect(page.locator('[data-testid="upload-zone"]')).toBeVisible();
  });

  test('displays keyboard shortcuts', async ({ page }) => {
    await page.keyboard.press('Meta+k');

    await expect(page.locator('text=⌘N')).toBeVisible();
    await expect(page.locator('text=⌘U')).toBeVisible();
  });

  test('clears search on close and reopen', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    await page.fill('[placeholder*="Search"]', 'upload');

    await page.keyboard.press('Escape');
    await page.keyboard.press('Meta+k');

    const input = page.locator('[placeholder*="Search"]');
    await expect(input).toHaveValue('');
  });

  test('shows recent commands section', async ({ page }) => {
    // Use a command first
    await page.keyboard.press('Meta+k');
    await page.click('text=New Chat');

    // Reopen command palette
    await page.keyboard.press('Meta+k');

    // Recent should show
    await expect(page.locator('text=Recent')).toBeVisible();
  });
});
