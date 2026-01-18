import { Page, expect } from '@playwright/test';

/**
 * Helper functions for E2E testing with Clerk authentication.
 *
 * Clerk renders its own form components with specific selectors.
 * These helpers abstract the authentication flow for tests.
 */

// Clerk's form input selectors
export const CLERK_SELECTORS = {
  // Sign In selectors
  emailInput: 'input[name="identifier"], input[id="identifier-field"], input[type="email"]',
  passwordInput: 'input[name="password"], input[id="password-field"], input[type="password"]',
  submitButton: 'button[type="submit"], button:has-text("Continue"), button:has-text("Sign in")',
  signUpLink: 'a:has-text("Sign up"), a[href*="signup"]',
  forgotPasswordLink: 'a:has-text("Forgot"), a[href*="forgot"]',
  errorMessage: '[data-error], .cl-formFieldErrorText, [class*="error"], .text-destructive',

  // Sign Up selectors
  firstNameInput: 'input[name="firstName"], input[id="firstName-field"]',
  lastNameInput: 'input[name="lastName"], input[id="lastName-field"]',

  // Generic form selectors
  form: 'form, .cl-form, [data-clerk]',
  loadingSpinner: '.cl-spinner, [class*="loading"]',
};

/**
 * Wait for Clerk's form to be fully loaded
 */
export async function waitForClerkForm(page: Page, timeout = 15000): Promise<boolean> {
  try {
    // Try multiple selectors for the form
    await Promise.race([
      page.waitForSelector(CLERK_SELECTORS.emailInput, { state: 'visible', timeout }),
      page.waitForSelector(CLERK_SELECTORS.form, { state: 'visible', timeout }),
      page.waitForSelector('form', { state: 'visible', timeout }),
    ]);
    return true;
  } catch {
    // Form might not be visible (e.g., already authenticated)
    return false;
  }
}

/**
 * Login using Clerk authentication
 */
export async function clerkLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');

  const formLoaded = await waitForClerkForm(page);
  if (!formLoaded) {
    // May already be redirected if authenticated
    return;
  }

  // Wait for and fill email
  const emailInput = page.locator(CLERK_SELECTORS.emailInput).first();
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(email);

  // Look for continue button or direct password field
  const passwordInput = page.locator(CLERK_SELECTORS.passwordInput).first();
  const continueButton = page.locator('button:has-text("Continue")').first();

  // Clerk might have multi-step login
  if (await continueButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await continueButton.click();
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  // Fill password if visible
  if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await passwordInput.fill(password);
  }

  // Submit
  const submitButton = page.locator(CLERK_SELECTORS.submitButton).first();
  await submitButton.click();
}

/**
 * Check if user is authenticated by trying to access workspaces
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const currentUrl = page.url();

  // Try to navigate to workspaces
  await page.goto('/workspaces');
  await page.waitForTimeout(2000);

  const url = page.url();
  const authenticated = !url.includes('/login') && !url.includes('/signup');

  // Restore original URL
  await page.goto(currentUrl);

  return authenticated;
}

/**
 * Logout using Clerk
 */
export async function clerkLogout(page: Page): Promise<void> {
  // Try to find and click user menu
  const userMenu = page.locator('[data-testid="user-menu"], .cl-userButton, [class*="userButton"]').first();

  if (await userMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
    await userMenu.click();

    const logoutButton = page.locator('text=Logout, text=Sign out, button:has-text("Sign out")').first();
    if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutButton.click();
    }
  }
}

/**
 * Setup authenticated page for tests that need auth
 * This injects Clerk mock values for testing
 */
export async function setupAuthenticatedPage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Mock Clerk for testing
    (window as any).__clerk_frontend_api = 'test';
    (window as any).__clerk_publishable_key = 'pk_test_mock';

    // Set a test mode flag
    (window as any).__clerk_testing_mode = true;
  });
}

/**
 * Get current page URL path
 */
export function getUrlPath(page: Page): string {
  const url = new URL(page.url());
  return url.pathname;
}

/**
 * Assert user is on login page
 */
export async function assertOnLoginPage(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
}

/**
 * Assert user is on workspaces page
 */
export async function assertOnWorkspacesPage(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/workspaces/, { timeout: 10000 });
}

/**
 * Wait for page to be ready after navigation
 */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500); // Small buffer for React hydration
}
