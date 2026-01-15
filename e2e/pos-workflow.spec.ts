import { test, expect } from "@playwright/test";

/**
 * POS Workflow E2E Tests
 *
 * These tests require a running dev server with seeded database.
 * Run `bun run db:seed` before running these tests.
 *
 * Test credentials (from seed):
 * - Staff: staff@demo.club / demo123456
 */

const TEST_STAFF = {
	email: "staff@demo.club",
	password: "demo123456",
};

test.describe("POS Workflow", () => {
	test.beforeEach(async ({ page }) => {
		// Login as staff
		await page.goto("/");
		await page.getByLabel(/email/i).fill(TEST_STAFF.email);
		await page.getByLabel(/password/i).fill(TEST_STAFF.password);
		await page.getByRole("button", { name: /sign in/i }).click();

		// Wait for redirect to POS dashboard
		await page.waitForURL(/\/pos/, { timeout: 10000 });
	});

	test("complete POS workflow: login → open register → create order → close register", async ({ page }) => {
		// 1. Login (already done in beforeEach)
		await expect(page.getByRole("heading", { name: /pos/i })).toBeVisible();

		// 2. Open register session
		await page.getByRole("button", { name: /open register/i }).click();
		
		// Enter opening cash amount
		await page.getByLabel(/opening cash/i).fill("100.00");
		await page.getByRole("button", { name: /open/i }).click();
		
		// Verify register is open
		await expect(page.getByText(/register open/i)).toBeVisible({ timeout: 5000 });

		// 3. Create an order with products
		await page.getByRole("button", { name: /new order/i }).click();
		
		// Add products to order
		await page.getByRole("button", { name: /add product/i }).first().click();
		await page.getByRole("button", { name: /add product/i }).first().click();
		
		// Complete the order
		await page.getByRole("button", { name: /checkout/i }).click();
		await page.getByRole("button", { name: /cash/i }).click();
		await page.getByRole("button", { name: /complete order/i }).click();
		
		// Verify order completion
		await expect(page.getByText(/order completed/i)).toBeVisible({ timeout: 5000 });

		// 4. Close register session with cash count
		await page.getByRole("button", { name: /close register/i }).click();
		
		// Enter closing cash count
		await page.getByLabel(/closing cash/i).fill("120.00");
		await page.getByRole("button", { name: /close/i }).click();
		
		// Verify register is closed
		await expect(page.getByText(/register closed/i)).toBeVisible({ timeout: 5000 });
	});

	test("can open register session", async ({ page }) => {
		await page.getByRole("button", { name: /open register/i }).click();
		await page.getByLabel(/opening cash/i).fill("50.00");
		await page.getByRole("button", { name: /open/i }).click();
		
		await expect(page.getByText(/register open/i)).toBeVisible({ timeout: 5000 });
	});

	test("can create order with products", async ({ page }) => {
		// Open register first
		await page.getByRole("button", { name: /open register/i }).click();
		await page.getByLabel(/opening cash/i).fill("100.00");
		await page.getByRole("button", { name: /open/i }).click();
		
		// Create order
		await page.getByRole("button", { name: /new order/i }).click();
		await page.getByRole("button", { name: /add product/i }).first().click();
		
		// Verify product added to order
		await expect(page.getByText(/total/i)).toBeVisible();
	});

	test("can close register with cash count", async ({ page }) => {
		// Open register first
		await page.getByRole("button", { name: /open register/i }).click();
		await page.getByLabel(/opening cash/i).fill("100.00");
		await page.getByRole("button", { name: /open/i }).click();
		
		// Close register
		await page.getByRole("button", { name: /close register/i }).click();
		await page.getByLabel(/closing cash/i).fill("100.00");
		await page.getByRole("button", { name: /close/i }).click();
		
		await expect(page.getByText(/register closed/i)).toBeVisible({ timeout: 5000 });
	});
});