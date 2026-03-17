import { test, expect } from "@playwright/test";

/**
 * Staff Workflow E2E Tests
 *
 * These tests require a running dev server with seeded database.
 * Run `bun run db:seed` before running these tests.
 *
 * Test credentials (from seed scripts/seed.ts):
 * - Staff: staff@clubos.app / SEED_PASSWORD env variable
 * - Admin: admin@clubos.app / SEED_PASSWORD env variable
 */

const TEST_STAFF = {
	email: "staff@clubos.app",
	password: process.env.SEED_PASSWORD || "demo123456",
};

const TEST_ADMIN = {
	email: "admin@clubos.app",
	password: process.env.SEED_PASSWORD || "demo123456",
};

test.describe("Staff Workflow", () => {
	test("staff login redirects to /staff page", async ({ page }) => {
		// Login as staff
		await page.goto("/");
		await page.getByLabel(/email/i).fill(TEST_STAFF.email);
		await page.getByLabel(/password/i).fill(TEST_STAFF.password);
		await page.getByRole("button", { name: /sign in/i }).click();

		// Wait for redirect to staff dashboard
		await page.waitForURL(/\/staff/, { timeout: 10000 });
		
		// Verify we're on the staff page
		await expect(page).toHaveURL(/\/staff/);
	});

	test("staff page displays New Sale button", async ({ page }) => {
		// Login as staff
		await page.goto("/");
		await page.getByLabel(/email/i).fill(TEST_STAFF.email);
		await page.getByLabel(/password/i).fill(TEST_STAFF.password);
		await page.getByRole("button", { name: /sign in/i }).click();

		// Wait for redirect to staff page
		await page.waitForURL(/\/staff/, { timeout: 10000 });

		// Check for New Sale button
		const newSaleButton = page.getByRole("button", { name: /new sale/i });
		await expect(newSaleButton).toBeVisible();
	});

	test("New Sale button opens a dialog", async ({ page }) => {
		// Login as staff
		await page.goto("/");
		await page.getByLabel(/email/i).fill(TEST_STAFF.email);
		await page.getByLabel(/password/i).fill(TEST_STAFF.password);
		await page.getByRole("button", { name: /sign in/i }).click();

		// Wait for redirect to staff page
		await page.waitForURL(/\/staff/, { timeout: 10000 });

		// Click New Sale button
		await page.getByRole("button", { name: /new sale/i }).click();

		// Verify dialog appears
		await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
	});

	test("admin can navigate to registers management page", async ({ page }) => {
		// Login as admin
		await page.goto("/");
		await page.getByLabel(/email/i).fill(TEST_ADMIN.email);
		await page.getByLabel(/password/i).fill(TEST_ADMIN.password);
		await page.getByRole("button", { name: /sign in/i }).click();

		// Wait for redirect to admin dashboard
		await page.waitForURL(/\/admin/, { timeout: 10000 });

		// Navigate to registers page
		await page.goto("/admin/registers");
		
		// Verify we're on the registers page
		await expect(page).toHaveURL(/\/admin\/registers/);
		
		// Check for page heading
		await expect(page.getByRole("heading", { name: /registers/i })).toBeVisible();
	});

	test("admin can access registers from navigation", async ({ page }) => {
		// Login as admin
		await page.goto("/");
		await page.getByLabel(/email/i).fill(TEST_ADMIN.email);
		await page.getByLabel(/password/i).fill(TEST_ADMIN.password);
		await page.getByRole("button", { name: /sign in/i }).click();

		// Wait for redirect to admin dashboard
		await page.waitForURL(/\/admin/, { timeout: 10000 });

		// Click on registers link in navigation
		const registersLink = page.getByRole("link", { name: /registers/i });
		await expect(registersLink).toBeVisible();
		await registersLink.click();

		// Verify navigation to registers page
		await page.waitForURL(/\/admin\/registers/);
		await expect(page.getByRole("heading", { name: /registers/i })).toBeVisible();
	});
});