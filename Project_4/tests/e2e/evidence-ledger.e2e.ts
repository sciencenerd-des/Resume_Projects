import { test, expect } from '@playwright/test';

test.describe('Evidence Ledger', () => {
  test.beforeEach(async ({ page }) => {
    // Log in and navigate to a session with evidence
    await page.goto('/login');
    await page.waitForSelector('[name="email"]', { state: 'visible', timeout: 10000 });
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/workspaces', { timeout: 10000 });
    await page.click('[data-testid="workspace-card"]:first-child');
    await page.click('[data-testid="nav-history"]');
  });

  test('displays evidence ledger panel', async ({ page }) => {
    // Click on a session with evidence
    await page.click('[data-testid="session-item"]:first-child');

    await expect(page.locator('[data-testid="evidence-ledger"]')).toBeVisible();
  });

  test('shows claim counts by verdict', async ({ page }) => {
    await page.click('[data-testid="session-item"]:first-child');

    await expect(page.locator('[data-testid="supported-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="weak-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="contradicted-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="not-found-count"]')).toBeVisible();
  });

  test('lists all claims with verdicts', async ({ page }) => {
    await page.click('[data-testid="session-item"]:first-child');

    const claims = page.locator('[data-testid="claim-row"]');
    await expect(claims.first()).toBeVisible();

    // Each claim should have a verdict badge
    await expect(claims.first().locator('[data-testid="verdict-badge"]')).toBeVisible();
  });

  test('expands claim to show evidence', async ({ page }) => {
    await page.click('[data-testid="session-item"]:first-child');

    // Click on a claim row
    await page.click('[data-testid="claim-row"]:first-child');

    // Verify evidence details expand
    await expect(page.locator('[data-testid="claim-evidence"]')).toBeVisible();
    await expect(page.locator('[data-testid="evidence-snippet"]')).toBeVisible();
  });

  test('shows confidence score', async ({ page }) => {
    await page.click('[data-testid="session-item"]:first-child');
    await page.click('[data-testid="claim-row"]:first-child');

    await expect(page.locator('[data-testid="confidence-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="confidence-score"]')).toContainText(/%/);
  });

  test('filters by verdict type', async ({ page }) => {
    await page.click('[data-testid="session-item"]:first-child');

    // Click filter
    await page.click('[data-testid="verdict-filter"]');
    await page.click('text=Supported');

    // Verify only supported claims shown
    const claims = page.locator('[data-testid="claim-row"]');
    const count = await claims.count();

    for (let i = 0; i < count; i++) {
      await expect(claims.nth(i).locator('[data-testid="verdict-badge"]')).toContainText('Supported');
    }
  });

  test('shows all claims after clearing filter', async ({ page }) => {
    await page.click('[data-testid="session-item"]:first-child');

    // Apply filter
    await page.click('[data-testid="verdict-filter"]');
    await page.click('text=Supported');

    // Clear filter
    await page.click('[data-testid="clear-filter"]');

    // Verify claims are shown (at least 1)
    const claimCount = await page.locator('[data-testid="claim-row"]').count();
    expect(claimCount).toBeGreaterThan(0);
  });

  test('links to source document', async ({ page }) => {
    await page.click('[data-testid="session-item"]:first-child');
    await page.click('[data-testid="claim-row"]:first-child');

    // Click view source
    await page.click('[data-testid="view-source"]');

    // Verify document viewer opens
    await expect(page.locator('[data-testid="document-viewer"]')).toBeVisible();
  });

  test('shows overall evidence coverage', async ({ page }) => {
    await page.click('[data-testid="session-item"]:first-child');

    await expect(page.locator('[data-testid="coverage-percentage"]')).toBeVisible();
    await expect(page.locator('[data-testid="coverage-percentage"]')).toContainText(/%/);
  });

  test('verdict badges have correct colors', async ({ page }) => {
    await page.click('[data-testid="session-item"]:first-child');

    // Check color classes
    const supportedBadge = page.locator('[data-verdict="supported"]').first();
    if (await supportedBadge.isVisible()) {
      await expect(supportedBadge).toHaveClass(/green/);
    }

    const weakBadge = page.locator('[data-verdict="weak"]').first();
    if (await weakBadge.isVisible()) {
      await expect(weakBadge).toHaveClass(/amber|yellow/);
    }
  });

  test('can export ledger as PDF', async ({ page }) => {
    await page.click('[data-testid="session-item"]:first-child');

    await page.click('[data-testid="export-ledger"]');
    await page.click('text=PDF');

    // Verify download starts or confirmation appears
    await expect(page.locator('text=Exporting')).toBeVisible();
  });

  test('can export ledger as JSON', async ({ page }) => {
    await page.click('[data-testid="session-item"]:first-child');

    await page.click('[data-testid="export-ledger"]');
    await page.click('text=JSON');

    await expect(page.locator('text=Exporting')).toBeVisible();
  });
});
