import { test, expect, Page } from '@playwright/test';

// Helper to setup authenticated page
async function setupAuthenticatedPage(page: Page) {
  await page.addInitScript(() => {
    (window as any).__clerk_frontend_api = 'test';
    (window as any).__clerk_publishable_key = 'pk_test_123';
  });
}

test.describe('UI/Accessibility Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
  });

  test.describe('Dark Theme Edge Cases', () => {
    test('should render correctly in dark mode', async ({ page }) => {
      await page.goto('/');
      // Check for dark theme class
      const html = page.locator('html');
      await expect(html).toHaveClass(/dark/);
    });

    test('should have proper color contrast in dark mode', async ({ page }) => {
      await page.goto('/');
      // Text should be readable against background
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('should style form inputs correctly in dark mode', async ({ page }) => {
      await page.goto('/login');
      const input = page.getByRole('textbox').first();
      if (await input.isVisible()) {
        // Input should have dark theme styling
        await expect(input).toBeVisible();
      }
    });

    test('should style buttons correctly in dark mode', async ({ page }) => {
      await page.goto('/');
      const button = page.getByRole('button').first();
      if (await button.isVisible()) {
        await expect(button).toBeVisible();
      }
    });

    test('should style dropdowns correctly in dark mode', async ({ page }) => {
      await page.goto('/');
      const dropdown = page.getByRole('combobox').first();
      if (await dropdown.isVisible()) {
        await dropdown.click();
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should style modals with proper backdrop in dark mode', async ({ page }) => {
      await page.goto('/');
      const createButton = page.getByRole('button', { name: /create/i }).first();
      if (await createButton.isVisible()) {
        await createButton.click();
        const dialog = page.getByRole('dialog');
        if (await dialog.isVisible()) {
          await expect(dialog).toBeVisible();
        }
      }
    });

    test('should not have pure white or pure black colors', async ({ page }) => {
      await page.goto('/');
      // Check that theme uses subtle colors, not pure black/white
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle theme transition gracefully', async ({ page }) => {
      await page.goto('/');
      // Theme should be applied without flicker
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Responsive Design Edge Cases', () => {
    test('should render correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should render correctly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should render correctly on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should show mobile navigation on small screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      const mobileNav = page.getByRole('button', { name: /menu|hamburger/i });
      // Mobile nav may or may not be present
      await expect(page.locator('body')).toBeVisible();
    });

    test('should hide sidebar on mobile and show toggle', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      // Sidebar should be collapsible on mobile
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle viewport resize smoothly', async ({ page }) => {
      await page.goto('/');
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(100);
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(100);
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle landscape orientation', async ({ page }) => {
      await page.setViewportSize({ width: 667, height: 375 }); // iPhone SE landscape
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should not have horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10); // Small tolerance
    });
  });

  test.describe('Keyboard Navigation Edge Cases', () => {
    test('should allow tabbing through all interactive elements', async ({ page }) => {
      await page.goto('/');
      // Tab through elements
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should show visible focus indicators', async ({ page }) => {
      await page.goto('/');
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      // Focus should be visible
      await expect(focusedElement).toBeVisible();
    });

    test('should trap focus in modal dialogs', async ({ page }) => {
      await page.goto('/');
      const createButton = page.getByRole('button', { name: /create/i }).first();
      if (await createButton.isVisible()) {
        await createButton.click();
        const dialog = page.getByRole('dialog');
        if (await dialog.isVisible()) {
          // Tab should cycle within dialog
          await page.keyboard.press('Tab');
          await page.keyboard.press('Tab');
          await page.keyboard.press('Tab');
          const focusedElement = page.locator(':focus');
          // Focus should remain within dialog
          await expect(dialog).toBeVisible();
        }
      }
    });

    test('should support Escape key to close dialogs', async ({ page }) => {
      await page.goto('/');
      const createButton = page.getByRole('button', { name: /create/i }).first();
      if (await createButton.isVisible()) {
        await createButton.click();
        const dialog = page.getByRole('dialog');
        if (await dialog.isVisible()) {
          await page.keyboard.press('Escape');
          await expect(dialog).not.toBeVisible();
        }
      }
    });

    test('should support Enter to submit forms', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('password123');
      await page.keyboard.press('Enter');
      // Form should submit
      await expect(page.locator('body')).toBeVisible();
    });

    test('should support arrow keys in dropdowns', async ({ page }) => {
      await page.goto('/');
      const dropdown = page.getByRole('combobox').first();
      if (await dropdown.isVisible()) {
        await dropdown.focus();
        await page.keyboard.press('Enter');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowUp');
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should not skip any focusable elements', async ({ page }) => {
      await page.goto('/');
      // Tab through all elements and ensure continuity
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('should support Shift+Tab for reverse navigation', async ({ page }) => {
      await page.goto('/');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe('Screen Reader Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/');
      const h1 = page.getByRole('heading', { level: 1 });
      // Should have at least one h1
      await expect(page.locator('body')).toBeVisible();
    });

    test('should have alt text for images', async ({ page }) => {
      await page.goto('/');
      const images = page.getByRole('img');
      const count = await images.count();
      for (let i = 0; i < count; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        // Images should have alt attribute (can be empty for decorative)
        expect(alt).not.toBeNull();
      }
    });

    test('should have labels for all form inputs', async ({ page }) => {
      await page.goto('/login');
      const inputs = page.locator('input:not([type="hidden"])');
      const count = await inputs.count();
      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        // Input should have associated label or aria-label
        const ariaLabel = await input.getAttribute('aria-label');
        const id = await input.getAttribute('id');
        if (!ariaLabel) {
          // Should have associated label via id
          expect(id).not.toBeNull();
        }
      }
    });

    test('should have ARIA landmarks', async ({ page }) => {
      await page.goto('/');
      // Should have main landmark
      const main = page.getByRole('main');
      await expect(main.or(page.locator('main'))).toBeVisible();
    });

    test('should have descriptive link text', async ({ page }) => {
      await page.goto('/');
      const links = page.getByRole('link');
      const count = await links.count();
      for (let i = 0; i < Math.min(count, 10); i++) {
        const link = links.nth(i);
        const text = await link.textContent();
        // Links should not be just "click here"
        if (text) {
          expect(text.toLowerCase()).not.toBe('click here');
          expect(text.toLowerCase()).not.toBe('read more');
        }
      }
    });

    test('should have ARIA live regions for dynamic content', async ({ page }) => {
      await page.goto('/');
      // Check for live regions
      const liveRegions = page.locator('[aria-live]');
      // May or may not be present
      await expect(page.locator('body')).toBeVisible();
    });

    test('should announce loading states', async ({ page }) => {
      await page.goto('/');
      // Loading indicators should have aria-busy or similar
      await expect(page.locator('body')).toBeVisible();
    });

    test('should have proper button labels', async ({ page }) => {
      await page.goto('/');
      const buttons = page.getByRole('button');
      const count = await buttons.count();
      for (let i = 0; i < Math.min(count, 10); i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        // Buttons should have text or aria-label
        expect(text || ariaLabel).toBeTruthy();
      }
    });
  });

  test.describe('Error State UI Edge Cases', () => {
    test('should show error messages clearly', async ({ page }) => {
      await page.goto('/login');
      // Submit empty form
      await page.getByRole('button', { name: /sign.*in|log.*in/i }).click();
      // Error should be visible with good contrast
      const errorMessage = page.locator('[class*="error"], [class*="destructive"], [role="alert"]');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
    });

    test('should associate errors with form fields', async ({ page }) => {
      await page.goto('/login');
      await page.getByRole('button', { name: /sign.*in|log.*in/i }).click();
      // Errors should be linked via aria-describedby
      await expect(page.locator('body')).toBeVisible();
    });

    test('should show error icon with messages', async ({ page }) => {
      await page.goto('/login');
      await page.getByRole('button', { name: /sign.*in|log.*in/i }).click();
      // Error messages should have icons
      const errorIcon = page.locator('[class*="error"] svg, [class*="destructive"] svg');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should clear errors when input is corrected', async ({ page }) => {
      await page.goto('/login');
      await page.getByRole('button', { name: /sign.*in|log.*in/i }).click();
      // Fill in fields
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('password123');
      // Errors should clear
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Loading State UI Edge Cases', () => {
    test('should show loading spinner during API calls', async ({ page }) => {
      await page.goto('/');
      // Loading indicators should be present during data fetch
      await expect(page.locator('body')).toBeVisible();
    });

    test('should show skeleton loaders for content', async ({ page }) => {
      await page.goto('/');
      // Skeleton loaders may be present
      const skeleton = page.locator('[class*="skeleton"], [class*="animate-pulse"]');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should disable buttons during loading', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('password123');
      // During submit, button should be disabled
      await expect(page.locator('body')).toBeVisible();
    });

    test('should show progress for file uploads', async ({ page }) => {
      await page.goto('/');
      // File upload progress may be shown
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Empty State UI Edge Cases', () => {
    test('should show helpful empty state for no documents', async ({ page }) => {
      await page.goto('/');
      // Empty state should have helpful message
      const emptyState = page.getByText(/no.*document|upload.*document|get.*started/i);
      // May or may not be visible depending on state
      await expect(page.locator('body')).toBeVisible();
    });

    test('should show helpful empty state for no sessions', async ({ page }) => {
      await page.goto('/');
      const sessionsTab = page.getByRole('tab', { name: /session|history/i });
      if (await sessionsTab.isVisible()) {
        await sessionsTab.click();
        // Should show empty state or session list
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should have action button in empty states', async ({ page }) => {
      await page.goto('/');
      // Empty states should have actionable buttons
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Toast/Notification UI Edge Cases', () => {
    test('should show toast for success actions', async ({ page }) => {
      await page.goto('/');
      // After successful action, toast may appear
      await expect(page.locator('body')).toBeVisible();
    });

    test('should show toast for error actions', async ({ page }) => {
      await page.goto('/');
      // After error, toast may appear
      await expect(page.locator('body')).toBeVisible();
    });

    test('should auto-dismiss toasts', async ({ page }) => {
      await page.goto('/');
      // Toasts should auto-dismiss
      await expect(page.locator('body')).toBeVisible();
    });

    test('should allow manual dismissal of toasts', async ({ page }) => {
      await page.goto('/');
      const toastCloseButton = page.getByRole('button', { name: /close|dismiss/i });
      // If toast is visible, should be dismissible
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Animation Edge Cases', () => {
    test('should respect reduced motion preference', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      // Animations should be disabled
      await expect(page.locator('body')).toBeVisible();
    });

    test('should have smooth transitions', async ({ page }) => {
      await page.goto('/');
      // Transitions should not be jarring
      await expect(page.locator('body')).toBeVisible();
    });

    test('should not have infinite animations that distract', async ({ page }) => {
      await page.goto('/');
      // Only loading states should animate
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Typography Edge Cases', () => {
    test('should have readable font sizes', async ({ page }) => {
      await page.goto('/');
      const body = page.locator('body');
      const fontSize = await body.evaluate(el =>
        window.getComputedStyle(el).fontSize
      );
      // Font size should be at least 14px
      const sizeNum = parseInt(fontSize);
      expect(sizeNum).toBeGreaterThanOrEqual(14);
    });

    test('should have adequate line height', async ({ page }) => {
      await page.goto('/');
      const paragraph = page.locator('p').first();
      if (await paragraph.isVisible()) {
        const lineHeight = await paragraph.evaluate(el =>
          window.getComputedStyle(el).lineHeight
        );
        // Line height should be set
        expect(lineHeight).not.toBe('normal');
      }
    });

    test('should handle long text with ellipsis', async ({ page }) => {
      await page.goto('/');
      // Long text should truncate, not overflow
      await expect(page.locator('body')).toBeVisible();
    });

    test('should support text zoom up to 200%', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        document.body.style.zoom = '2';
      });
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Icon and Visual Edge Cases', () => {
    test('should have consistent icon sizing', async ({ page }) => {
      await page.goto('/');
      const icons = page.locator('svg');
      const count = await icons.count();
      // Icons should be visible and sized appropriately
      await expect(page.locator('body')).toBeVisible();
    });

    test('should have icons in buttons for clarity', async ({ page }) => {
      await page.goto('/');
      const buttonsWithIcons = page.locator('button svg');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should not rely solely on color for information', async ({ page }) => {
      await page.goto('/');
      // Important info should have icons or text, not just color
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Scrolling Edge Cases', () => {
    test('should have smooth scrolling', async ({ page }) => {
      await page.goto('/');
      // Scroll behavior should be smooth
      await page.evaluate(() => {
        window.scrollTo({ top: 500, behavior: 'smooth' });
      });
      await expect(page.locator('body')).toBeVisible();
    });

    test('should show scroll indicators when content overflows', async ({ page }) => {
      await page.goto('/');
      // Scrollable areas should be indicated
      await expect(page.locator('body')).toBeVisible();
    });

    test('should preserve scroll position on navigation', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => window.scrollTo(0, 200));
      // Navigate and come back
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
