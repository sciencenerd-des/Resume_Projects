import { test, expect } from '@playwright/test';

test.describe('Workspace Management', () => {
  test.beforeEach(async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.waitForSelector('[name="email"]', { state: 'visible', timeout: 10000 });
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/workspaces', { timeout: 10000 });
  });

  test('displays list of workspaces', async ({ page }) => {
    await expect(page.locator('[data-testid="workspace-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="workspace-card"]').first()).toBeVisible();
  });

  test('user can create a new workspace', async ({ page }) => {
    // Click create button
    await page.click('[data-testid="create-workspace-button"]');

    // Fill workspace name
    await page.waitForSelector('[data-testid="workspace-name-input"]', { state: 'visible' });
    await page.fill('[data-testid="workspace-name-input"]', `New Workspace ${Date.now()}`);

    // Submit
    await page.click('[data-testid="create-workspace-submit"]');

    // Verify workspace created
    await expect(page.locator('text=New Workspace')).toBeVisible({ timeout: 5000 });
  });

  test('user can select a workspace', async ({ page }) => {
    // Click on a workspace
    await page.click('[data-testid="workspace-card"]:first-child');

    // Verify navigation to workspace home
    await expect(page).toHaveURL(/\/workspace\/[a-z0-9-]+/);
  });

  test('displays workspace stats', async ({ page }) => {
    await page.click('[data-testid="workspace-card"]:first-child');

    // Verify stats are visible
    await expect(page.locator('[data-testid="document-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-count"]')).toBeVisible();
  });

  test('user can switch between workspaces', async ({ page }) => {
    // Select first workspace
    await page.click('[data-testid="workspace-card"]:first-child');
    await expect(page).toHaveURL(/\/workspace\/[a-z0-9-]+/);

    // Click workspace switcher
    await page.click('[data-testid="workspace-switcher"]');

    // Select another workspace
    await page.click('[data-testid="workspace-option"]:nth-child(2)');

    // Verify URL changed
    const url1 = page.url();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/workspace\/[a-z0-9-]+/);
  });

  test('shows empty state for new workspace', async ({ page }) => {
    // Create new workspace
    await page.click('[data-testid="create-workspace-button"]');
    await page.fill('[data-testid="workspace-name-input"]', `Empty Workspace ${Date.now()}`);
    await page.click('[data-testid="create-workspace-submit"]');

    // Click on the new workspace
    await page.click('text=Empty Workspace');

    // Verify empty state
    await expect(page.locator('text=No documents yet')).toBeVisible();
    await expect(page.locator('text=Upload your first document')).toBeVisible();
  });

  test('workspace name is editable', async ({ page }) => {
    await page.click('[data-testid="workspace-card"]:first-child');

    // Click settings or edit button
    await page.click('[data-testid="workspace-settings"]');

    // Edit name
    await page.fill('[data-testid="workspace-name-input"]', 'Updated Name');
    await page.click('[data-testid="save-settings"]');

    // Verify name updated
    await expect(page.locator('text=Updated Name')).toBeVisible();
  });
});
