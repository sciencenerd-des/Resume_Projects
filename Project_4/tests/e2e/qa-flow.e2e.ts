import { test, expect } from '@playwright/test';

test.describe('Q&A Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Log in and navigate to workspace
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/workspaces');
    await page.click('text=Test Workspace');
    await page.click('text=Chat');
  });

  test('user can ask a question and receive a verified answer', async ({ page }) => {
    // Type question
    const input = page.locator('[placeholder*="Ask a question"]');
    await input.fill('What is the maximum loan-to-value ratio?');

    // Submit
    await page.click('button:has-text("Send")');

    // Verify loading state
    await expect(page.locator('text=Generating')).toBeVisible();

    // Wait for response
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 30000 });

    // Verify citations present
    await expect(page.locator('[data-testid="citation-anchor"]').first()).toBeVisible();

    // Verify Evidence Ledger visible
    await expect(page.locator('text=Evidence Ledger')).toBeVisible();

    // Verify at least one claim verified
    await expect(page.locator('[data-verdict]').first()).toBeVisible();
  });

  test('user can click citation to view source', async ({ page }) => {
    // Ask a question first
    const input = page.locator('[placeholder*="Ask a question"]');
    await input.fill('What are the requirements?');
    await page.click('button:has-text("Send")');
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 30000 });

    // Click first citation
    await page.click('[data-testid="citation-anchor"]:first-child');

    // Verify source popover appears
    await expect(page.locator('[data-testid="citation-popover"]')).toBeVisible();

    // Verify snippet shown
    await expect(page.locator('[data-testid="evidence-snippet"]')).toContainText(/.+/);

    // Click "View in document"
    await page.click('text=View in document');

    // Verify document viewer opens with highlight
    await expect(page.locator('[data-testid="document-viewer"]')).toBeVisible();
    await expect(page.locator('[data-testid="highlighted-chunk"]')).toBeVisible();
  });

  test('user can review claim in Evidence Ledger', async ({ page }) => {
    // Ask a question
    const input = page.locator('[placeholder*="Ask a question"]');
    await input.fill('Explain the policy details');
    await page.click('button:has-text("Send")');
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 30000 });

    // Click on a claim in the ledger
    await page.click('[data-testid="ledger-row"]:first-child');

    // Verify claim details expand
    await expect(page.locator('[data-testid="claim-details"]')).toBeVisible();

    // Verify evidence snippet shown
    await expect(page.locator('[data-testid="evidence-snippet"]')).toBeVisible();

    // Verify verdict badge displayed
    await expect(page.locator('[data-testid="verdict-badge"]')).toBeVisible();
  });

  test('streaming response displays progressively', async ({ page }) => {
    // Ask a question
    const input = page.locator('[placeholder*="Ask a question"]');
    await input.fill('Give a detailed summary');
    await page.click('button:has-text("Send")');

    // Capture initial content length
    const initialContent = await page.locator('[data-testid="assistant-message"]').textContent();

    // Wait briefly
    await page.waitForTimeout(500);

    // Verify content has grown
    const laterContent = await page.locator('[data-testid="assistant-message"]').textContent();
    expect(laterContent?.length).toBeGreaterThan(initialContent?.length || 0);
  });

  test('user can filter claims by verdict', async ({ page }) => {
    // Generate a response
    const input = page.locator('[placeholder*="Ask a question"]');
    await input.fill('Summarize the policy');
    await page.click('button:has-text("Send")');
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 30000 });

    // Filter by "supported"
    await page.click('text=Filter');
    await page.click('text=Supported');

    // Verify only supported claims shown
    const rows = page.locator('[data-testid="ledger-row"]');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText('Supported');
    }
  });
});
