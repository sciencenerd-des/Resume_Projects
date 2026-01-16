import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.waitForSelector('[name="email"]', { state: 'visible', timeout: 10000 });
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/workspaces', { timeout: 10000 });
  });

  test('opens settings page', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Settings');

    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible();
  });

  test('displays user profile section', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Settings');

    await expect(page.locator('[data-testid="profile-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-email"]')).toContainText('test@example.com');
  });

  test('theme can be changed', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Settings');

    // Click theme selector
    await page.click('[data-testid="theme-selector"]');
    await page.click('text=Dark');

    // Verify dark mode is applied
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('theme persists after page reload', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Settings');

    await page.click('[data-testid="theme-selector"]');
    await page.click('text=Dark');

    await page.reload();

    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('system theme option is available', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Settings');

    await page.click('[data-testid="theme-selector"]');

    await expect(page.locator('text=System')).toBeVisible();
  });

  test('can update profile name', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Settings');

    await page.fill('[data-testid="name-input"]', 'Updated Name');
    await page.click('[data-testid="save-profile"]');

    await expect(page.locator('text=Profile updated')).toBeVisible();
  });

  test('shows notification preferences', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Settings');

    await expect(page.locator('[data-testid="notification-settings"]')).toBeVisible();
  });

  test('can toggle email notifications', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Settings');

    const toggle = page.locator('[data-testid="email-notifications-toggle"]');
    await toggle.click();

    await expect(page.locator('text=Settings saved')).toBeVisible();
  });

  test('shows API keys section', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Settings');

    await page.click('text=API Keys');

    await expect(page.locator('[data-testid="api-keys-section"]')).toBeVisible();
  });

  test('can generate new API key', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Settings');
    await page.click('text=API Keys');

    await page.click('[data-testid="generate-api-key"]');

    await expect(page.locator('[data-testid="api-key-value"]')).toBeVisible();
  });

  test('shows danger zone', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Settings');

    await expect(page.locator('[data-testid="danger-zone"]')).toBeVisible();
    await expect(page.locator('text=Delete Account')).toBeVisible();
  });

  test('delete account requires confirmation', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Settings');

    await page.click('[data-testid="delete-account-button"]');

    // Confirmation modal should appear
    await expect(page.locator('[data-testid="confirm-delete-modal"]')).toBeVisible();
    await expect(page.locator('text=This action cannot be undone')).toBeVisible();
  });

  test('keyboard shortcuts section is visible', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Settings');

    await page.click('text=Keyboard Shortcuts');

    await expect(page.locator('[data-testid="shortcuts-section"]')).toBeVisible();
    await expect(page.locator('text=⌘K')).toBeVisible();
  });
});
