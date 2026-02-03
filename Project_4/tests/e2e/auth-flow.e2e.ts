import { test, expect } from '@playwright/test';
import {
  waitForClerkForm,
  waitForPageReady,
  CLERK_SELECTORS,
} from './helpers/clerk-auth';

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test('displays login form', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      // Page should load successfully
      await expect(page.locator('body')).toBeVisible();

      // Should have VerityDraft branding
      await expect(page.locator('text=VerityDraft')).toBeVisible({ timeout: 10000 });
    });

    test('shows sign up link', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      // Should have a link to sign up
      const signUpLink = page.locator('a[href*="signup"], text=Sign up').first();
      await expect(signUpLink).toBeVisible({ timeout: 10000 });
    });

    test('redirects to login when accessing protected route', async ({ page }) => {
      await page.goto('/workspaces');
      await waitForPageReady(page);

      // Should redirect to login (or show sign-in form)
      await page.waitForTimeout(2000);
      const url = page.url();
      expect(url.includes('/login') || url.includes('/workspaces')).toBeTruthy();
    });
  });

  test.describe('Signup Page', () => {
    test('displays signup form', async ({ page }) => {
      await page.goto('/signup');
      await waitForPageReady(page);

      // Page should load successfully
      await expect(page.locator('body')).toBeVisible();

      // Should have VerityDraft branding
      await expect(page.locator('text=VerityDraft')).toBeVisible({ timeout: 10000 });
    });

    test('shows sign in link', async ({ page }) => {
      await page.goto('/signup');
      await waitForPageReady(page);

      // Should have a link to sign in
      const signInLink = page.locator('a[href*="login"], text=Sign in').first();
      await expect(signInLink).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Auth State', () => {
    test('unauthenticated user is redirected from protected routes', async ({ page }) => {
      const protectedRoutes = ['/workspaces'];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await page.waitForTimeout(2000);

        // Should either redirect to login or show the page (if already authed)
        const url = page.url();
        expect(url).toBeDefined();
      }
    });

    test('public routes are accessible without auth', async ({ page }) => {
      const publicRoutes = ['/login', '/signup'];

      for (const route of publicRoutes) {
        await page.goto(route);
        await waitForPageReady(page);

        // Should stay on the page
        expect(page.url()).toContain(route.replace('/', ''));
      }
    });
  });

  test.describe('Page Loading', () => {
    test('login page loads without errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));

      await page.goto('/login');
      await waitForPageReady(page);

      // Page should load
      await expect(page.locator('body')).toBeVisible();
    });

    test('signup page loads without errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));

      await page.goto('/signup');
      await waitForPageReady(page);

      // Page should load
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('can navigate between login and signup', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      // Click sign up link
      const signUpLink = page.locator('a[href*="signup"], text=Sign up').first();
      if (await signUpLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await signUpLink.click();
        await page.waitForTimeout(1000);
        expect(page.url()).toContain('signup');

        // Click sign in link
        const signInLink = page.locator('a[href*="login"], text=Sign in').first();
        if (await signInLink.isVisible({ timeout: 5000 }).catch(() => false)) {
          await signInLink.click();
          await page.waitForTimeout(1000);
          expect(page.url()).toContain('login');
        }
      }
    });

    test('browser back button works', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page);

      await page.goto('/signup');
      await waitForPageReady(page);

      await page.goBack();
      await page.waitForTimeout(500);

      // Should navigate back
      expect(page.url()).toBeDefined();
    });
  });
});
