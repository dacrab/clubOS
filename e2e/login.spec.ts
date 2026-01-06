import { test, expect } from "@playwright/test";

test.describe("Login Flow", () => {
	test("shows login page with correct elements", async ({ page }) => {
		await page.goto("/");

		// Check page title and form elements
		await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
		await expect(page.getByLabel(/email/i)).toBeVisible();
		await expect(page.getByLabel(/password/i)).toBeVisible();
		await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
	});

	test("shows error for invalid credentials", async ({ page }) => {
		await page.goto("/");

		await page.getByLabel(/email/i).fill("invalid@test.com");
		await page.getByLabel(/password/i).fill("wrongpassword");
		await page.getByRole("button", { name: /sign in/i }).click();

		// Should show error toast
		await expect(page.getByText(/invalid|error/i)).toBeVisible({ timeout: 5000 });
	});

	test("shows forgot password link", async ({ page }) => {
		await page.goto("/");

		const forgotLink = page.getByRole("button", { name: /forgot password/i });
		await expect(forgotLink).toBeVisible();
	});

	test("has link to signup page", async ({ page }) => {
		await page.goto("/");

		const signupLink = page.getByRole("link", { name: /sign up/i });
		await expect(signupLink).toBeVisible();
		await signupLink.click();

		await expect(page).toHaveURL("/signup");
	});

	test("signup page has correct form", async ({ page }) => {
		await page.goto("/signup");

		await expect(page.getByLabel(/full name/i)).toBeVisible();
		await expect(page.getByLabel(/email/i)).toBeVisible();
		await expect(page.getByLabel(/^password$/i)).toBeVisible();
		await expect(page.getByLabel(/confirm password/i)).toBeVisible();
		await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
	});
});
