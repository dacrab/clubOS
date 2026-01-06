import { test, expect } from "@playwright/test";

/**
 * Admin Product CRUD E2E Tests
 *
 * These tests require a running dev server with seeded database.
 * Run `bun run db:seed` before running these tests.
 *
 * Test credentials (from seed):
 * - Admin: admin@demo.club / demo123456
 */

const TEST_ADMIN = {
	email: "admin@demo.club",
	password: "demo123456",
};

test.describe("Admin Product CRUD", () => {
	test.beforeEach(async ({ page }) => {
		// Login as admin
		await page.goto("/");
		await page.getByLabel(/email/i).fill(TEST_ADMIN.email);
		await page.getByLabel(/password/i).fill(TEST_ADMIN.password);
		await page.getByRole("button", { name: /sign in/i }).click();

		// Wait for redirect to admin dashboard
		await page.waitForURL(/\/admin/, { timeout: 10000 });
	});

	test("can navigate to products page", async ({ page }) => {
		await page.getByRole("link", { name: /products/i }).click();
		await page.waitForURL(/\/admin\/products/);

		await expect(page.getByRole("heading", { name: /products/i })).toBeVisible();
	});

	test("can open add product dialog", async ({ page }) => {
		await page.goto("/admin/products");

		await page.getByRole("button", { name: /add product/i }).click();

		// Dialog should be visible
		await expect(page.getByRole("dialog")).toBeVisible();
		await expect(page.getByLabel(/product name/i)).toBeVisible();
		await expect(page.getByLabel(/price/i)).toBeVisible();
	});

	test("can create a new product", async ({ page }) => {
		await page.goto("/admin/products");

		const productName = `Test Product ${Date.now()}`;

		await page.getByRole("button", { name: /add product/i }).click();
		await page.getByLabel(/product name/i).fill(productName);
		await page.getByLabel(/price/i).fill("9.99");
		await page.getByLabel(/stock/i).fill("100");

		await page.getByRole("button", { name: /save/i }).click();

		// Wait for dialog to close and product to appear
		await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
		await expect(page.getByText(productName)).toBeVisible({ timeout: 5000 });
	});

	test("can edit an existing product", async ({ page }) => {
		await page.goto("/admin/products");

		// Click edit on first product row
		const firstRow = page.locator("table tbody tr").first();
		await firstRow.getByRole("button", { name: /edit/i }).click();

		// Dialog should open with existing data
		await expect(page.getByRole("dialog")).toBeVisible();

		// Modify the name
		const nameInput = page.getByLabel(/product name/i);
		const originalName = await nameInput.inputValue();
		await nameInput.fill(`${originalName} (edited)`);

		await page.getByRole("button", { name: /save/i }).click();

		// Verify change
		await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
		await expect(page.getByText(`${originalName} (edited)`)).toBeVisible();
	});

	test("can delete a product", async ({ page }) => {
		await page.goto("/admin/products");

		// First create a product to delete
		const productName = `Delete Me ${Date.now()}`;
		await page.getByRole("button", { name: /add product/i }).click();
		await page.getByLabel(/product name/i).fill(productName);
		await page.getByLabel(/price/i).fill("1.00");
		await page.getByRole("button", { name: /save/i }).click();
		await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });

		// Find and delete the product
		const productRow = page.locator("table tbody tr", { hasText: productName });
		await productRow.getByRole("button", { name: /delete/i }).click();

		// Handle confirmation dialog
		page.on("dialog", (dialog) => dialog.accept());

		// Product should be removed
		await expect(page.getByText(productName)).not.toBeVisible({ timeout: 5000 });
	});

	test("shows validation error for empty product name", async ({ page }) => {
		await page.goto("/admin/products");

		await page.getByRole("button", { name: /add product/i }).click();
		await page.getByLabel(/price/i).fill("9.99");

		// Try to save without name
		await page.getByRole("button", { name: /save/i }).click();

		// Should show validation or stay on dialog
		await expect(page.getByRole("dialog")).toBeVisible();
	});
});
