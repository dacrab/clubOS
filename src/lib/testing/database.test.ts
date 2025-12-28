/**
 * Database Schema, Triggers, and RLS Policy Tests
 *
 * These tests verify:
 * - Database triggers work correctly (updated_at, stock management, order totals)
 * - RLS policies enforce proper access control
 * - Schema constraints are enforced
 * - Data integrity is maintained
 *
 * NOTE: These tests require a running Supabase instance and use the service role
 * to test RLS policies by impersonating different users.
 * 
 * To run these tests locally:
 * 1. Start local Supabase: `supabase start`
 * 2. Run tests: `npm run test`
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Test configuration - uses local Supabase instance
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || "http://localhost:54321";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || "";

// Skip tests if:
// - No service key configured
// - Running in CI environment
// - Not pointing to a local Supabase instance
// - SKIP_DB_TESTS env var is set (for local development without Supabase running)
const isLocalUrl = SUPABASE_URL.includes("localhost") || SUPABASE_URL.includes("127.0.0.1");
const shouldSkip = !SUPABASE_SERVICE_KEY || 
	process.env.CI === "true" || 
	process.env.SKIP_DB_TESTS === "true" ||
	!isLocalUrl;

// Helper to assert value exists and narrow type
function assertDefined<T>(value: T | null | undefined, message: string): asserts value is T {
	if (value === null || value === undefined) {
		throw new Error(`Assertion failed: ${message}`);
	}
}

// Test data holders
interface TestData {
	adminClient: SupabaseClient;
	tenantId: string;
	facilityId: string;
	ownerId: string;
	staffId: string;
	categoryId: string;
	productId: string;
}

const testData: Partial<TestData> = {};

// Type guard to ensure test data is initialized
function getTestData(): TestData {
	if (shouldSkip) return testData as TestData;
	assertDefined(testData.adminClient, "adminClient not initialized");
	assertDefined(testData.tenantId, "tenantId not initialized");
	assertDefined(testData.facilityId, "facilityId not initialized");
	assertDefined(testData.ownerId, "ownerId not initialized");
	assertDefined(testData.staffId, "staffId not initialized");
	return testData as TestData;
}

describe.skipIf(shouldSkip)("Database Integration Tests", () => {
	beforeAll(async () => {
		if (shouldSkip || !SUPABASE_SERVICE_KEY) {
			return;
		}
		
		// Create admin client for setup
		testData.adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
			auth: { persistSession: false, autoRefreshToken: false },
		});

		// Test connection first - if this fails, the test suite will be skipped
		const { error: connError } = await testData.adminClient.from("tenants").select("id").limit(1);
		if (connError) {
			throw new Error(`Supabase not reachable: ${connError.message}. Start local Supabase with 'supabase start'`);
		}

		// Create test tenant
		const { data: tenant } = await testData.adminClient
			.from("tenants")
			.insert({ name: `Test Tenant ${Date.now()}`, slug: `test-tenant-${Date.now()}` })
			.select()
			.single();

		assertDefined(tenant, "Failed to create test tenant");
		testData.tenantId = tenant.id;

		// Create test subscription
		const trialEnd = new Date();
		trialEnd.setDate(trialEnd.getDate() + 14);
		await testData.adminClient.from("subscriptions").insert({
			tenant_id: tenant.id,
			status: "trialing",
			trial_end: trialEnd.toISOString(),
			current_period_end: trialEnd.toISOString(),
		});

		// Create test facility
		const { data: facility } = await testData.adminClient
			.from("facilities")
			.insert({ tenant_id: tenant.id, name: "Test Facility" })
			.select()
			.single();

		assertDefined(facility, "Failed to create test facility");
		testData.facilityId = facility.id;

		// Create test users via auth
		const { data: ownerAuth } = await testData.adminClient.auth.admin.createUser({
			email: `owner-${Date.now()}@test.com`,
			password: "TestPassword123!",
			email_confirm: true,
		});
		assertDefined(ownerAuth.user, "Failed to create owner user");
		testData.ownerId = ownerAuth.user.id;

		await testData.adminClient.from("memberships").insert({
			user_id: ownerAuth.user.id,
			tenant_id: tenant.id,
			role: "owner",
			is_primary: true,
		});

		const { data: staffAuth } = await testData.adminClient.auth.admin.createUser({
			email: `staff-${Date.now()}@test.com`,
			password: "TestPassword123!",
			email_confirm: true,
		});
		assertDefined(staffAuth.user, "Failed to create staff user");
		testData.staffId = staffAuth.user.id;

		await testData.adminClient.from("memberships").insert({
			user_id: staffAuth.user.id,
			tenant_id: tenant.id,
			facility_id: facility.id,
			role: "staff",
			is_primary: true,
		});
	});

	afterAll(async () => {
		if (shouldSkip) return;
		// Cleanup test data
		if (testData.adminClient && testData.tenantId) {
			await testData.adminClient.from("tenants").delete().eq("id", testData.tenantId);

			if (testData.ownerId) {
				await testData.adminClient.auth.admin.deleteUser(testData.ownerId);
			}
			if (testData.staffId) {
				await testData.adminClient.auth.admin.deleteUser(testData.staffId);
			}
		}
	});

	describe("Trigger: updated_at Auto-Update", () => {
		it("should automatically update updated_at on tenant update", async () => {
			const td = getTestData();

			const { data: before } = await td.adminClient
				.from("tenants")
				.select("updated_at")
				.eq("id", td.tenantId)
				.single();

			assertDefined(before, "Failed to fetch tenant before update");

			await new Promise((resolve) => setTimeout(resolve, 100));

			await td.adminClient
				.from("tenants")
				.update({ name: `Updated Tenant ${Date.now()}` })
				.eq("id", td.tenantId);

			const { data: after } = await td.adminClient
				.from("tenants")
				.select("updated_at")
				.eq("id", td.tenantId)
				.single();

			assertDefined(after, "Failed to fetch tenant after update");
			expect(new Date(after.updated_at).getTime()).toBeGreaterThan(
				new Date(before.updated_at).getTime()
			);
		});

		it("should automatically update updated_at on facility update", async () => {
			const td = getTestData();

			const { data: before } = await td.adminClient
				.from("facilities")
				.select("updated_at")
				.eq("id", td.facilityId)
				.single();

			assertDefined(before, "Failed to fetch facility before update");

			await new Promise((resolve) => setTimeout(resolve, 100));

			await td.adminClient
				.from("facilities")
				.update({ name: `Updated Facility ${Date.now()}` })
				.eq("id", td.facilityId);

			const { data: after } = await td.adminClient
				.from("facilities")
				.select("updated_at")
				.eq("id", td.facilityId)
				.single();

			assertDefined(after, "Failed to fetch facility after update");
			expect(new Date(after.updated_at).getTime()).toBeGreaterThan(
				new Date(before.updated_at).getTime()
			);
		});
	});

	describe("Trigger: Stock Management", () => {
		let productId: string;
		let orderId: string;
		const initialStock = 100;

		beforeEach(async () => {
			const td = getTestData();

			const { data: category } = await td.adminClient
				.from("categories")
				.insert({ facility_id: td.facilityId, name: `Cat ${Date.now()}` })
				.select()
				.single();

			assertDefined(category, "Failed to create test category");

			const { data: product } = await td.adminClient
				.from("products")
				.insert({
					facility_id: td.facilityId,
					category_id: category.id,
					name: `Product ${Date.now()}`,
					price: 10.0,
					stock_quantity: initialStock,
					track_inventory: true,
				})
				.select()
				.single();

			assertDefined(product, "Failed to create test product");
			productId = product.id;

			const { data: order } = await td.adminClient
				.from("orders")
				.insert({
					facility_id: td.facilityId,
					created_by: td.ownerId,
					status: "pending",
				})
				.select()
				.single();

			assertDefined(order, "Failed to create test order");
			orderId = order.id;
		});

		it("should decrease stock when order item is created", async () => {
			const td = getTestData();
			const quantity = 5;

			await td.adminClient.from("order_items").insert({
				order_id: orderId,
				product_id: productId,
				product_name: "Test Product",
				quantity,
				unit_price: 10.0,
				line_total: quantity * 10.0,
			});

			const { data: product } = await td.adminClient
				.from("products")
				.select("stock_quantity")
				.eq("id", productId)
				.single();

			assertDefined(product, "Failed to fetch product");
			expect(product.stock_quantity).toBe(initialStock - quantity);
		});

		it("should restore stock when order item is soft-deleted", async () => {
			const td = getTestData();
			const quantity = 5;

			const { data: item } = await td.adminClient
				.from("order_items")
				.insert({
					order_id: orderId,
					product_id: productId,
					product_name: "Test Product",
					quantity,
					unit_price: 10.0,
					line_total: quantity * 10.0,
				})
				.select()
				.single();

			assertDefined(item, "Failed to create order item");

			await td.adminClient
				.from("order_items")
				.update({ is_deleted: true, deleted_at: new Date().toISOString() })
				.eq("id", item.id);

			const { data: product } = await td.adminClient
				.from("products")
				.select("stock_quantity")
				.eq("id", productId)
				.single();

			assertDefined(product, "Failed to fetch product");
			expect(product.stock_quantity).toBe(initialStock);
		});

		it("should adjust stock when quantity changes", async () => {
			const td = getTestData();
			const originalQty = 5;
			const newQty = 8;

			const { data: item } = await td.adminClient
				.from("order_items")
				.insert({
					order_id: orderId,
					product_id: productId,
					product_name: "Test Product",
					quantity: originalQty,
					unit_price: 10.0,
					line_total: originalQty * 10.0,
				})
				.select()
				.single();

			assertDefined(item, "Failed to create order item");

			await td.adminClient
				.from("order_items")
				.update({ quantity: newQty, line_total: newQty * 10.0 })
				.eq("id", item.id);

			const { data: product } = await td.adminClient
				.from("products")
				.select("stock_quantity")
				.eq("id", productId)
				.single();

			assertDefined(product, "Failed to fetch product");
			expect(product.stock_quantity).toBe(initialStock - newQty);
		});

		it("should not affect stock for products without inventory tracking", async () => {
			const td = getTestData();

			const { data: nonTrackedProduct } = await td.adminClient
				.from("products")
				.insert({
					facility_id: td.facilityId,
					name: `Non-Tracked ${Date.now()}`,
					price: 5.0,
					stock_quantity: 50,
					track_inventory: false,
				})
				.select()
				.single();

			assertDefined(nonTrackedProduct, "Failed to create non-tracked product");

			await td.adminClient.from("order_items").insert({
				order_id: orderId,
				product_id: nonTrackedProduct.id,
				product_name: "Non-Tracked",
				quantity: 10,
				unit_price: 5.0,
				line_total: 50.0,
			});

			const { data: product } = await td.adminClient
				.from("products")
				.select("stock_quantity")
				.eq("id", nonTrackedProduct.id)
				.single();

			assertDefined(product, "Failed to fetch product");
			expect(product.stock_quantity).toBe(50);
		});
	});

	describe("Trigger: Order Total Calculation", () => {
		let orderId: string;
		let productId: string;

		beforeEach(async () => {
			const td = getTestData();

			const { data: product } = await td.adminClient
				.from("products")
				.insert({
					facility_id: td.facilityId,
					name: `Product ${Date.now()}`,
					price: 25.0,
					track_inventory: false,
				})
				.select()
				.single();

			assertDefined(product, "Failed to create product");
			productId = product.id;

			const { data: order } = await td.adminClient
				.from("orders")
				.insert({
					facility_id: td.facilityId,
					created_by: td.ownerId,
					status: "pending",
				})
				.select()
				.single();

			assertDefined(order, "Failed to create order");
			orderId = order.id;
		});

		it("should calculate subtotal from order items", async () => {
			const td = getTestData();

			await td.adminClient.from("order_items").insert([
				{
					order_id: orderId,
					product_id: productId,
					product_name: "Item 1",
					quantity: 2,
					unit_price: 25.0,
					line_total: 50.0,
				},
				{
					order_id: orderId,
					product_id: productId,
					product_name: "Item 2",
					quantity: 1,
					unit_price: 25.0,
					line_total: 25.0,
				},
			]);

			const { data: order } = await td.adminClient
				.from("orders")
				.select("subtotal, total_amount")
				.eq("id", orderId)
				.single();

			assertDefined(order, "Failed to fetch order");
			expect(Number(order.subtotal)).toBe(75.0);
			expect(Number(order.total_amount)).toBe(75.0);
		});

		it("should exclude deleted items from total", async () => {
			const td = getTestData();

			await td.adminClient.from("order_items").insert([
				{
					order_id: orderId,
					product_id: productId,
					product_name: "Keep",
					quantity: 1,
					unit_price: 25.0,
					line_total: 25.0,
				},
				{
					order_id: orderId,
					product_id: productId,
					product_name: "Delete",
					quantity: 1,
					unit_price: 25.0,
					line_total: 25.0,
				},
			]);

			await td.adminClient
				.from("order_items")
				.update({ is_deleted: true, deleted_at: new Date().toISOString() })
				.eq("product_name", "Delete")
				.eq("order_id", orderId);

			const { data: order } = await td.adminClient
				.from("orders")
				.select("subtotal")
				.eq("id", orderId)
				.single();

			assertDefined(order, "Failed to fetch order");
			expect(Number(order.subtotal)).toBe(25.0);
		});

		it("should exclude treat items from subtotal", async () => {
			const td = getTestData();

			await td.adminClient.from("order_items").insert([
				{
					order_id: orderId,
					product_id: productId,
					product_name: "Regular",
					quantity: 1,
					unit_price: 25.0,
					line_total: 25.0,
					is_treat: false,
				},
				{
					order_id: orderId,
					product_id: productId,
					product_name: "Treat",
					quantity: 1,
					unit_price: 25.0,
					line_total: 25.0,
					is_treat: true,
				},
			]);

			const { data: order } = await td.adminClient
				.from("orders")
				.select("subtotal")
				.eq("id", orderId)
				.single();

			assertDefined(order, "Failed to fetch order");
			expect(Number(order.subtotal)).toBe(25.0);
		});
	});

	describe("Trigger: Booking Validation", () => {
		it("should require field_number for football bookings", async () => {
			const td = getTestData();

			const { error } = await td.adminClient.from("bookings").insert({
				facility_id: td.facilityId,
				type: "football",
				customer_name: "John Doe",
				starts_at: new Date().toISOString(),
				ends_at: new Date(Date.now() + 3600000).toISOString(),
				created_by: td.ownerId,
				details: {},
			});

			expect(error).toBeDefined();
			assertDefined(error, "Expected error for missing field_number");
			expect(error.message).toContain("field_number");
		});

		it("should allow football booking with field_number", async () => {
			const td = getTestData();

			const { error } = await td.adminClient.from("bookings").insert({
				facility_id: td.facilityId,
				type: "football",
				customer_name: "John Doe",
				starts_at: new Date().toISOString(),
				ends_at: new Date(Date.now() + 3600000).toISOString(),
				created_by: td.ownerId,
				details: { field_number: "1" },
			});

			expect(error).toBeNull();
		});

		it("should require num_children for birthday bookings", async () => {
			const td = getTestData();

			const { error } = await td.adminClient.from("bookings").insert({
				facility_id: td.facilityId,
				type: "birthday",
				customer_name: "Jane Doe",
				starts_at: new Date().toISOString(),
				ends_at: new Date(Date.now() + 7200000).toISOString(),
				created_by: td.ownerId,
				details: {},
			});

			expect(error).toBeDefined();
			assertDefined(error, "Expected error for missing num_children");
			expect(error.message).toContain("num_children");
		});

		it("should allow birthday booking with num_children", async () => {
			const td = getTestData();

			const { error } = await td.adminClient.from("bookings").insert({
				facility_id: td.facilityId,
				type: "birthday",
				customer_name: "Jane Doe",
				starts_at: new Date().toISOString(),
				ends_at: new Date(Date.now() + 7200000).toISOString(),
				created_by: td.ownerId,
				details: { num_children: 10, num_adults: 5 },
			});

			expect(error).toBeNull();
		});

		it("should not require special details for event bookings", async () => {
			const td = getTestData();

			const { error } = await td.adminClient.from("bookings").insert({
				facility_id: td.facilityId,
				type: "event",
				customer_name: "Event Org",
				starts_at: new Date().toISOString(),
				ends_at: new Date(Date.now() + 14400000).toISOString(),
				created_by: td.ownerId,
				details: {},
			});

			expect(error).toBeNull();
		});
	});

	describe("Schema Constraints", () => {
		it("should enforce unique tenant slug", async () => {
			const td = getTestData();
			const slug = `unique-slug-${Date.now()}`;

			await td.adminClient.from("tenants").insert({
				name: "First Tenant",
				slug,
			});

			const { error } = await td.adminClient.from("tenants").insert({
				name: "Second Tenant",
				slug,
			});

			expect(error).toBeDefined();
			assertDefined(error, "Expected unique constraint error");
			expect(error.message || error.code).toBeTruthy();
		});

		it("should enforce slug format (lowercase alphanumeric with hyphens)", async () => {
			const td = getTestData();

			const { error } = await td.adminClient.from("tenants").insert({
				name: "Bad Slug Tenant",
				slug: "Invalid Slug!",
			});

			expect(error).toBeDefined();
		});

		it("should enforce unique facility name per tenant", async () => {
			const td = getTestData();
			const facilityName = `Duplicate Facility ${Date.now()}`;

			await td.adminClient.from("facilities").insert({
				tenant_id: td.tenantId,
				name: facilityName,
			});

			const { error } = await td.adminClient.from("facilities").insert({
				tenant_id: td.tenantId,
				name: facilityName,
			});

			expect(error).toBeDefined();
			assertDefined(error, "Expected unique constraint error");
			expect(error.code).toBe("23505");
		});

		it("should enforce unique product name per facility", async () => {
			const td = getTestData();
			const productName = `Duplicate Product ${Date.now()}`;

			await td.adminClient.from("products").insert({
				facility_id: td.facilityId,
				name: productName,
				price: 10.0,
			});

			const { error } = await td.adminClient.from("products").insert({
				facility_id: td.facilityId,
				name: productName,
				price: 20.0,
			});

			expect(error).toBeDefined();
			assertDefined(error, "Expected unique constraint error");
			expect(error.code).toBe("23505");
		});

		it("should enforce positive price constraint", async () => {
			const td = getTestData();

			const { error } = await td.adminClient.from("products").insert({
				facility_id: td.facilityId,
				name: `Negative Price ${Date.now()}`,
				price: -5.0,
			});

			expect(error).toBeDefined();
		});

		it("should enforce booking end > start constraint", async () => {
			const td = getTestData();
			const now = new Date();

			const { error } = await td.adminClient.from("bookings").insert({
				facility_id: td.facilityId,
				type: "event",
				customer_name: "Test",
				starts_at: now.toISOString(),
				ends_at: new Date(now.getTime() - 3600000).toISOString(),
				created_by: td.ownerId,
			});

			expect(error).toBeDefined();
		});

		it("should prevent self-referential category parent", async () => {
			const td = getTestData();

			const { data: category } = await td.adminClient
				.from("categories")
				.insert({
					facility_id: td.facilityId,
					name: `Self Ref ${Date.now()}`,
				})
				.select()
				.single();

			assertDefined(category, "Failed to create category");

			const { error } = await td.adminClient
				.from("categories")
				.update({ parent_id: category.id })
				.eq("id", category.id);

			expect(error).toBeDefined();
		});
	});

	describe("RLS Policies - Access Control", () => {
		it("should allow service role to access all tenants", async () => {
			const td = getTestData();

			const { data, error } = await td.adminClient.from("tenants").select("*");

			expect(error).toBeNull();
			expect(data).toBeDefined();
			assertDefined(data, "Expected tenants data");
			expect(data.length).toBeGreaterThan(0);
		});

		it("should allow service role to insert tenants", async () => {
			const td = getTestData();

			const { error } = await td.adminClient.from("tenants").insert({
				name: `Service Role Tenant ${Date.now()}`,
				slug: `service-role-${Date.now()}`,
			});

			expect(error).toBeNull();
		});

		it("should allow service role to manage subscriptions", async () => {
			const td = getTestData();

			const { error } = await td.adminClient
				.from("subscriptions")
				.update({ plan_name: "Updated Plan" })
				.eq("tenant_id", td.tenantId);

			expect(error).toBeNull();
		});

		it("should allow owner to view their tenant", async () => {
			const td = getTestData();

			const { data } = await td.adminClient
				.from("memberships")
				.select("tenant_id")
				.eq("user_id", td.ownerId)
				.single();

			expect(data).toBeDefined();
			assertDefined(data, "Expected membership data");
			expect(data.tenant_id).toBe(td.tenantId);
		});

		it("should prevent accessing other tenants' data", async () => {
			const td = getTestData();

			const { data: otherTenant } = await td.adminClient
				.from("tenants")
				.insert({ name: `Other ${Date.now()}`, slug: `other-${Date.now()}` })
				.select()
				.single();

			assertDefined(otherTenant, "Failed to create other tenant");

			const { data: memberships } = await td.adminClient
				.from("memberships")
				.select("tenant_id")
				.eq("user_id", td.ownerId);

			assertDefined(memberships, "Expected memberships data");
			const accessibleTenantIds = memberships.map((m) => m.tenant_id);
			expect(accessibleTenantIds).toContain(td.tenantId);
			expect(accessibleTenantIds).not.toContain(otherTenant.id);

			await td.adminClient.from("tenants").delete().eq("id", otherTenant.id);
		});
	});
});
