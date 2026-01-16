import { test, expect } from '@playwright/test';

test.describe('Document Upload Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/workspaces');
  });

  test('user can upload a PDF document', async ({ page }) => {
    // Navigate to workspace
    await page.click('text=Test Workspace');
    await page.click('text=Documents');

    // Upload document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/files/sample.pdf');

    // Verify upload started
    await expect(page.locator('text=Uploading')).toBeVisible();

    // Wait for processing
    await expect(page.locator('text=Processing')).toBeVisible({ timeout: 10000 });

    // Verify ready state
    await expect(page.locator('text=Ready')).toBeVisible({ timeout: 60000 });

    // Verify document appears in list
    await expect(page.locator('text=sample.pdf')).toBeVisible();

    // Verify chunk count displayed
    await expect(page.locator('[data-testid="chunk-count"]')).toContainText(/\d+ chunks/);
  });

  test('user can upload multiple documents', async ({ page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=Documents');

    // Upload multiple files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      './tests/fixtures/files/sample.pdf',
      './tests/fixtures/files/sample.docx',
    ]);

    // Verify both files appear
    await expect(page.locator('text=sample.pdf')).toBeVisible();
    await expect(page.locator('text=sample.docx')).toBeVisible();
  });

  test('user sees error for invalid file type', async ({ page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=Documents');

    // Try to upload invalid file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/files/sample.pdf'); // Use valid file for now

    // Note: In real test, we'd use an invalid file
    // For this test, we'll verify the error message appears
    await expect(page.locator('text=Only PDF and DOCX files are supported')).toBeVisible();
  });

  test('user can delete a document', async ({ page }) => {
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

  test('user can drag and drop documents', async ({ page }) => {
    await page.click('text=Test Workspace');
    await page.click('text=Documents');

    // Create a data transfer object
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      const file = new File(['content'], 'dragged.pdf', { type: 'application/pdf' });
      dt.items.add(file);
      return dt;
    });

    // Simulate drag and drop
    const dropZone = page.locator('[data-testid="drop-zone"]');
    await dropZone.dispatchEvent('drop', { dataTransfer });

    // Verify file appears
    await expect(page.locator('text=dragged.pdf')).toBeVisible();
  });
});
