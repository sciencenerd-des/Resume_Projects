import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.waitForSelector('[name="email"]', { state: 'visible', timeout: 10000 });
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/workspaces', { timeout: 10000 });
    await page.click('[data-testid="workspace-card"]:first-child');
  });

  test('sidebar shows all navigation items', async ({ page }) => {
    await expect(page.locator('[data-testid="nav-home"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-chat"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-documents"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-history"]')).toBeVisible();
  });

  test('navigates to Home', async ({ page }) => {
    await page.click('[data-testid="nav-home"]');
    await expect(page).toHaveURL(/\/workspace\/[a-z0-9-]+$/);
  });

  test('navigates to Chat', async ({ page }) => {
    await page.click('[data-testid="nav-chat"]');
    await expect(page).toHaveURL(/\/chat/);
  });

  test('navigates to Documents', async ({ page }) => {
    await page.click('[data-testid="nav-documents"]');
    await expect(page).toHaveURL(/\/documents/);
  });

  test('navigates to History', async ({ page }) => {
    await page.click('[data-testid="nav-history"]');
    await expect(page).toHaveURL(/\/history/);
  });

  test('highlights active nav item', async ({ page }) => {
    await page.click('[data-testid="nav-documents"]');

    const activeItem = page.locator('[data-testid="nav-documents"]');
    await expect(activeItem).toHaveClass(/active|selected|bg-/);
  });

  test('sidebar can be collapsed', async ({ page }) => {
    await page.click('[data-testid="sidebar-toggle"]');

    // Verify sidebar is collapsed
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toHaveClass(/collapsed|w-16/);
  });

  test('sidebar expands on toggle', async ({ page }) => {
    // Collapse first
    await page.click('[data-testid="sidebar-toggle"]');
    await page.waitForTimeout(300);

    // Expand
    await page.click('[data-testid="sidebar-toggle"]');

    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).not.toHaveClass(/collapsed/);
  });

  test('breadcrumbs show current location', async ({ page }) => {
    await page.click('[data-testid="nav-documents"]');

    await expect(page.locator('[data-testid="breadcrumb"]')).toContainText('Documents');
  });

  test('breadcrumbs are clickable', async ({ page }) => {
    await page.click('[data-testid="nav-documents"]');
    await page.click('[data-testid="breadcrumb-home"]');

    await expect(page).toHaveURL(/\/workspace\/[a-z0-9-]+$/);
  });

  test('back button works', async ({ page }) => {
    const initialUrl = page.url();

    await page.click('[data-testid="nav-documents"]');
    await page.goBack();

    expect(page.url()).toBe(initialUrl);
  });

  test('mobile menu opens on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.click('[data-testid="mobile-menu-button"]');

    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  });

  test('mobile menu closes when item selected', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.click('[data-testid="mobile-menu-button"]');
    await page.click('[data-testid="mobile-nav-documents"]');

    await expect(page.locator('[data-testid="mobile-menu"]')).not.toBeVisible();
  });
});

test.describe('Deep Linking', () => {
  test.beforeEach(async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.waitForSelector('[name="email"]', { state: 'visible', timeout: 10000 });
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/workspaces', { timeout: 10000 });
  });

  test('can navigate directly to workspace', async ({ page }) => {
    // Get a workspace ID first
    await page.click('[data-testid="workspace-card"]:first-child');
    const url = page.url();
    const workspaceId = url.split('/workspace/')[1];

    // Navigate directly
    await page.goto(`/workspace/${workspaceId}`);

    await expect(page.locator('[data-testid="workspace-home"]')).toBeVisible();
  });

  test('can navigate directly to documents', async ({ page }) => {
    await page.click('[data-testid="workspace-card"]:first-child');
    const url = page.url();
    const workspaceId = url.split('/workspace/')[1];

    await page.goto(`/workspace/${workspaceId}/documents`);

    await expect(page.locator('[data-testid="documents-page"]')).toBeVisible();
  });

  test('can navigate directly to chat', async ({ page }) => {
    await page.click('[data-testid="workspace-card"]:first-child');
    const url = page.url();
    const workspaceId = url.split('/workspace/')[1];

    await page.goto(`/workspace/${workspaceId}/chat`);

    await expect(page.locator('[data-testid="chat-page"]')).toBeVisible();
  });
});
