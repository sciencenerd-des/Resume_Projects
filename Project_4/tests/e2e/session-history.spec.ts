import { test, expect } from '@playwright/test';

test.describe('Session History', () => {
  test.beforeEach(async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/workspaces');
  });

  test('user can view past sessions', async ({ page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=History');

    // Verify session list loads
    await expect(page.locator('[data-testid="session-card"]').first()).toBeVisible();

    // Verify session shows preview
    await expect(page.locator('[data-testid="session-preview"]').first()).toContainText(/.+/);

    // Verify timestamp shown
    await expect(page.locator('[data-testid="session-timestamp"]').first()).toBeVisible();
  });

  test('user can continue a previous session', async ({ page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=History');

    // Click on a session
    await page.click('[data-testid="session-card"]:first-child');

    // Verify previous messages load (at least 2)
    const messageCount = await page.locator('[data-testid="message"]').count();
    expect(messageCount).toBeGreaterThanOrEqual(2);

    // Add follow-up question
    const input = page.locator('[placeholder*="Ask a question"]');
    await input.fill('Can you elaborate on that?');
    await page.click('button:has-text("Send")');

    // Verify new message appears (at least 4)
    const newMessageCount = await page.locator('[data-testid="message"]').count();
    expect(newMessageCount).toBeGreaterThanOrEqual(4);
  });

  test('user can export a session to Markdown', async ({ page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=History');
    await page.click('[data-testid="session-card"]:first-child');

    // Click export button
    await page.click('button:has-text("Export")');

    // Verify format options
    await expect(page.locator('text=Markdown')).toBeVisible();
    await expect(page.locator('text=PDF')).toBeVisible();
    await expect(page.locator('text=JSON')).toBeVisible();

    // Select Markdown
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Markdown'),
    ]);

    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.md$/);
  });

  test('user can export a session to PDF', async ({ page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=History');
    await page.click('[data-testid="session-card"]:first-child');

    // Click export button
    await page.click('button:has-text("Export")');

    // Select PDF
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=PDF'),
    ]);

    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('user can export a session to JSON', async ({ page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=History');
    await page.click('[data-testid="session-card"]:first-child');

    // Click export button
    await page.click('button:has-text("Export")');

    // Select JSON
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=JSON'),
    ]);

    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });
});
