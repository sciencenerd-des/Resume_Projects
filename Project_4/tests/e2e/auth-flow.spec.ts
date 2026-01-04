import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  // NOTE: This test requires Supabase email settings to be configured:
  // - In Supabase Dashboard → Authentication → Email Templates: Configure SMTP
  // - Or disable email confirmation in: Authentication → Providers → Email → Confirm email: OFF
  test.skip('user can sign up', async ({ page }) => {
    await page.goto('/signup');

    // Wait for form to be ready (after SupabaseProvider initializes)
    await page.waitForSelector('[name="email"]', { state: 'visible', timeout: 10000 });

    // Fill signup form - include all required fields
    await page.fill('[name="name"]', 'New User');
    await page.fill('[name="email"]', `newuser_${Date.now()}@example.com`);
    await page.fill('[name="password"]', 'SecurePassword123!');
    await page.fill('[name="confirmPassword"]', 'SecurePassword123!');

    // Check terms checkbox if present
    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }

    // Submit form
    await page.click('button[type="submit"]');

    // Verify redirect to workspaces (with longer timeout for Supabase)
    await expect(page).toHaveURL('/workspaces', { timeout: 10000 });

    // Verify user is logged in
    await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 5000 });
  });

  test('user can log in', async ({ page }) => {
    await page.goto('/login');

    // Wait for form to be ready (after SupabaseProvider initializes)
    await page.waitForSelector('[name="email"]', { state: 'visible', timeout: 10000 });

    // Fill login form
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');

    // Submit form
    await page.click('button[type="submit"]');

    // Verify redirect to workspaces (with longer timeout for Supabase)
    await expect(page).toHaveURL('/workspaces', { timeout: 10000 });
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Wait for form to be ready
    await page.waitForSelector('[name="email"]', { state: 'visible', timeout: 10000 });

    await page.fill('[name="email"]', 'invalid@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Verify error message (Supabase returns "Invalid login credentials")
    await expect(page.locator('text=Invalid login credentials')).toBeVisible({ timeout: 10000 });
  });

  test('user can log out', async ({ page }) => {
    // First log in
    await page.goto('/login');
    await page.waitForSelector('[name="email"]', { state: 'visible', timeout: 10000 });
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/workspaces', { timeout: 10000 });

    // Wait for page to be ready
    await page.waitForSelector('[data-testid="user-menu"]', { state: 'visible', timeout: 5000 });

    // Click user menu to open it
    await page.click('[data-testid="user-menu"]');

    // Wait for logout button to appear and click it
    await page.waitForSelector('text=Logout', { state: 'visible', timeout: 5000 });
    await page.click('text=Logout');

    // Verify redirect to login (longer timeout for logout processing)
    await expect(page).toHaveURL('/login', { timeout: 10000 });
  });

  test('redirects to login when accessing protected route', async ({ page }) => {
    await page.goto('/workspaces');

    // Verify redirect to login
    await expect(page).toHaveURL('/login');
  });
});
