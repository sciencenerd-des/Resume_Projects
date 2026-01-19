# E2E Test Guide

> **Version:** 1.0
> **Last Updated:** 2026-01-03

---

## 1. Overview

End-to-end tests validate complete user journeys through the VerityDraft application, ensuring all components work together correctly.

---

## 2. Test Framework

### 2.1 Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 2.2 Test Setup

```typescript
// tests/e2e/fixtures/auth.ts
import { test as base, Page } from '@playwright/test';

type Fixtures = {
  authenticatedPage: Page;
  testUser: { email: string; password: string };
};

export const test = base.extend<Fixtures>({
  testUser: async ({}, use) => {
    await use({
      email: 'test@example.com',
      password: 'testpassword123',
    });
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    await page.goto('/login');
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/workspaces');
    await use(page);
  },
});

export { expect } from '@playwright/test';
```

---

## 3. Core User Journeys

### 3.1 Document Upload Journey

```typescript
// tests/e2e/document-upload.spec.ts
import { test, expect } from './fixtures/auth';

test.describe('Document Upload Journey', () => {
  test('user can upload a PDF and see it processed', async ({ authenticatedPage: page }) => {
    // Navigate to workspace
    await page.click('text=Test Workspace');
    await page.click('text=Documents');

    // Upload document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/sample-policy.pdf');

    // Verify upload started
    await expect(page.locator('text=Uploading')).toBeVisible();

    // Wait for processing
    await expect(page.locator('text=Processing')).toBeVisible({ timeout: 10000 });

    // Verify ready state
    await expect(page.locator('text=Ready')).toBeVisible({ timeout: 60000 });

    // Verify document appears in list
    await expect(page.locator('text=sample-policy.pdf')).toBeVisible();

    // Verify chunk count displayed
    await expect(page.locator('[data-testid="chunk-count"]')).toContainText(/\d+ chunks/);
  });

  test('user sees error for invalid file type', async ({ authenticatedPage: page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=Documents');

    // Try to upload invalid file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/invalid.exe');

    // Verify error message
    await expect(page.locator('text=Only PDF and DOCX files are supported')).toBeVisible();
  });

  test('user can delete a document', async ({ authenticatedPage: page }) => {
    // First, ensure document exists
    await page.click('text=Test Workspace');
    await page.click('text=Documents');

    // Click delete button on document
    await page.hover('[data-testid="document-card"]');
    await page.click('[data-testid="delete-document"]');

    // Confirm deletion
    await expect(page.locator('text=Delete Document')).toBeVisible();
    await page.click('button:has-text("Delete")');

    // Verify document removed
    await expect(page.locator('[data-testid="document-card"]')).not.toBeVisible();
  });
});
```

### 3.2 Question & Answer Journey

```typescript
// tests/e2e/qa-flow.spec.ts
import { test, expect } from './fixtures/auth';

test.describe('Q&A Flow', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Navigate to chat in workspace with existing documents
    await page.click('text=Test Workspace');
    await page.click('text=Chat');
  });

  test('user can ask a question and receive a verified answer', async ({ authenticatedPage: page }) => {
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

  test('user can click citation to view source', async ({ authenticatedPage: page }) => {
    // Ask a question
    await page.locator('[placeholder*="Ask a question"]').fill('What are the requirements?');
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

  test('user can review claim in Evidence Ledger', async ({ authenticatedPage: page }) => {
    // Ask a question
    await page.locator('[placeholder*="Ask a question"]').fill('Explain the policy details');
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

  test('streaming response displays progressively', async ({ authenticatedPage: page }) => {
    await page.locator('[placeholder*="Ask a question"]').fill('Give a detailed summary');
    await page.click('button:has-text("Send")');

    // Capture initial content length
    const initialContent = await page.locator('[data-testid="assistant-message"]').textContent();

    // Wait briefly
    await page.waitForTimeout(500);

    // Verify content has grown
    const laterContent = await page.locator('[data-testid="assistant-message"]').textContent();
    expect(laterContent?.length).toBeGreaterThan(initialContent?.length || 0);
  });
});
```

### 3.3 Draft Generation Journey

```typescript
// tests/e2e/draft-flow.spec.ts
import { test, expect } from './fixtures/auth';

test.describe('Draft Generation Flow', () => {
  test('user can generate a draft with revision cycles', async ({ authenticatedPage: page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=Chat');

    // Switch to Draft mode
    await page.click('button:has-text("Draft")');
    await expect(page.locator('button:has-text("Draft")')).toHaveClass(/bg-blue-600/);

    // Enter draft prompt
    await page.locator('[placeholder*="Ask a question"]').fill(
      'Write an executive summary of the policy requirements'
    );
    await page.click('button:has-text("Send")');

    // Wait for draft generation
    await expect(page.locator('text=Generating draft')).toBeVisible();

    // Verify revision indicator appears if needed
    const revisionIndicator = page.locator('text=/Revision \\d of \\d/');
    await revisionIndicator.waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});

    // Wait for completion
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 120000 });

    // Verify multiple citations
    const citations = page.locator('[data-testid="citation-anchor"]');
    await expect(citations).toHaveCount({ minimum: 3 });

    // Verify coverage displayed
    await expect(page.locator('[data-testid="coverage-score"]')).toBeVisible();

    // Verify coverage meets threshold
    const coverageText = await page.locator('[data-testid="coverage-score"]').textContent();
    const coverageValue = parseInt(coverageText?.replace('%', '') || '0');
    expect(coverageValue).toBeGreaterThanOrEqual(85);
  });

  test('user sees unsupported claims flagged', async ({ authenticatedPage: page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=Chat');
    await page.click('button:has-text("Draft")');

    // Request something likely to have unsupported claims
    await page.locator('[placeholder*="Ask a question"]').fill(
      'Predict the future market trends based on the data'
    );
    await page.click('button:has-text("Send")');

    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 120000 });

    // Look for "not found" or "weak" verdicts
    const unsupportedClaims = page.locator('[data-verdict="not_found"], [data-verdict="weak"]');
    const count = await unsupportedClaims.count();

    if (count > 0) {
      // Verify they're visually distinct
      await expect(unsupportedClaims.first()).toHaveClass(/bg-amber-|bg-gray-/);
    }
  });
});
```

### 3.4 Session History Journey

```typescript
// tests/e2e/session-history.spec.ts
import { test, expect } from './fixtures/auth';

test.describe('Session History', () => {
  test('user can view past sessions', async ({ authenticatedPage: page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=History');

    // Verify session list loads
    await expect(page.locator('[data-testid="session-card"]').first()).toBeVisible();

    // Verify session shows preview
    await expect(page.locator('[data-testid="session-preview"]').first()).toContainText(/.+/);

    // Verify timestamp shown
    await expect(page.locator('[data-testid="session-timestamp"]').first()).toBeVisible();
  });

  test('user can continue a previous session', async ({ authenticatedPage: page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=History');

    // Click on a session
    await page.click('[data-testid="session-card"]:first-child');

    // Verify previous messages load
    await expect(page.locator('[data-testid="message"]')).toHaveCount({ minimum: 2 });

    // Add follow-up question
    await page.locator('[placeholder*="Ask a question"]').fill('Can you elaborate on that?');
    await page.click('button:has-text("Send")');

    // Verify new message appears
    await expect(page.locator('[data-testid="message"]')).toHaveCount({ minimum: 4 });
  });

  test('user can export a session', async ({ authenticatedPage: page }) => {
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
});
```

### 3.5 Export Journey

```typescript
// tests/e2e/export.spec.ts
import { test, expect } from './fixtures/auth';
import fs from 'fs';

test.describe('Export Functionality', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Generate a response to export
    await page.click('text=Test Workspace');
    await page.click('text=Chat');
    await page.locator('[placeholder*="Ask a question"]').fill('Summarize the main points');
    await page.click('button:has-text("Send")');
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 30000 });
  });

  test('exports to Markdown with citations', async ({ authenticatedPage: page }) => {
    await page.click('button:has-text("Export")');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Markdown'),
    ]);

    const path = await download.path();
    const content = fs.readFileSync(path!, 'utf-8');

    // Verify content structure
    expect(content).toContain('# ');
    expect(content).toContain('[^'); // Footnote references
    expect(content).toContain('## Sources');
    expect(content).toContain('## Evidence Ledger');
  });

  test('exports to JSON with full data', async ({ authenticatedPage: page }) => {
    await page.click('button:has-text("Export")');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=JSON'),
    ]);

    const path = await download.path();
    const content = JSON.parse(fs.readFileSync(path!, 'utf-8'));

    // Verify JSON structure
    expect(content).toHaveProperty('query');
    expect(content).toHaveProperty('response');
    expect(content).toHaveProperty('ledger');
    expect(content.ledger).toHaveProperty('entries');
    expect(content.ledger).toHaveProperty('summary');
  });

  test('exports to PDF', async ({ authenticatedPage: page }) => {
    await page.click('button:has-text("Export")');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=PDF'),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.pdf$/);

    // Verify file is not empty
    const path = await download.path();
    const stats = fs.statSync(path!);
    expect(stats.size).toBeGreaterThan(1000);
  });
});
```

---

## 4. Visual Regression Tests

```typescript
// tests/e2e/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('Evidence Ledger matches snapshot', async ({ page }) => {
    await page.goto('/demo/evidence-ledger');
    await expect(page).toHaveScreenshot('evidence-ledger.png', {
      maxDiffPixels: 100,
    });
  });

  test('Chat interface matches snapshot', async ({ page }) => {
    await page.goto('/demo/chat');
    await expect(page).toHaveScreenshot('chat-interface.png');
  });

  test('Verdict badges match snapshot', async ({ page }) => {
    await page.goto('/demo/verdicts');
    await expect(page.locator('[data-testid="verdict-badges"]')).toHaveScreenshot('verdicts.png');
  });
});
```

---

## 5. Accessibility Tests

```typescript
// tests/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility', () => {
  test('chat page passes accessibility checks', async ({ page }) => {
    await page.goto('/workspaces/test/chat');
    await injectAxe(page);
    await checkA11y(page);
  });

  test('Evidence Ledger is keyboard navigable', async ({ page }) => {
    await page.goto('/workspaces/test/chat');
    // Generate a response first
    await page.fill('[placeholder*="Ask"]', 'Test question');
    await page.press('[placeholder*="Ask"]', 'Enter');
    await page.waitForSelector('[data-testid="ledger-row"]');

    // Navigate with keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify focus on ledger row
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focused).toBe('ledger-row');

    // Activate with Enter
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="claim-details"]')).toBeVisible();
  });

  test('all images have alt text', async ({ page }) => {
    await page.goto('/');
    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });
});
```

---

## 6. Mobile Tests

```typescript
// tests/e2e/mobile.spec.ts
import { test, expect, devices } from '@playwright/test';

test.use(devices['iPhone 13']);

test.describe('Mobile Experience', () => {
  test('sidebar opens as drawer', async ({ page }) => {
    await page.goto('/workspaces');

    // Sidebar should be hidden
    await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible();

    // Open menu
    await page.click('[data-testid="menu-toggle"]');

    // Sidebar appears as drawer
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
  });

  test('Evidence Ledger opens as bottom sheet', async ({ page }) => {
    await page.goto('/workspaces/test/chat');
    await page.fill('[placeholder*="Ask"]', 'Test');
    await page.click('button:has-text("Send")');

    await page.waitForSelector('[data-testid="assistant-message"]');

    // Click to open ledger
    await page.click('[data-testid="show-ledger"]');

    // Ledger appears from bottom
    await expect(page.locator('[data-testid="ledger-bottom-sheet"]')).toBeVisible();
  });

  test('touch targets are adequately sized', async ({ page }) => {
    await page.goto('/workspaces/test/chat');

    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      const box = await button.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
```

---

## 7. Running E2E Tests

```bash
# Run all E2E tests
bunx playwright test

# Run specific test file
bunx playwright test tests/e2e/qa-flow.spec.ts

# Run with UI mode
bunx playwright test --ui

# Run headed (visible browser)
bunx playwright test --headed

# Run specific project
bunx playwright test --project=chromium

# Update snapshots
bunx playwright test --update-snapshots

# Show report
bunx playwright show-report
```
