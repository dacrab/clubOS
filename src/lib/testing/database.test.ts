/**
 * Database Integration Tests - requires running Supabase
 * Run: SKIP_DB_TESTS=false bun run test src/lib/testing/database.test.ts
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || "http://localhost:54321";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || "";
const isLocal = SUPABASE_URL.includes("localhost") || SUPABASE_URL.includes("127.0.0.1");
const shouldSkip = !SUPABASE_SERVICE_KEY || process.env.CI === "true" || process.env.SKIP_DB_TESTS !== "false" || !isLocal;

interface TestData { admin: SupabaseClient; tenantId: string; facilityId: string; ownerId: string; }
const td: Partial<TestData> = {};

describe.skipIf(shouldSkip)("Database Integration", () => {
	beforeAll(async () => {
		td.admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
		
		const { data: tenant } = await td.admin.from("tenants").insert({ name: `Test ${Date.now()}`, slug: `test-${Date.now()}` }).select().single();
		td.tenantId = tenant!.id;

		const trialEnd = new Date(Date.now() + 14 * 86400000).toISOString();
		await td.admin.from("subscriptions").insert({ tenant_id: tenant!.id, status: "trialing", trial_end: trialEnd, current_period_end: trialEnd });

		const { data: facility } = await td.admin.from("facilities").insert({ tenant_id: tenant!.id, name: "Test Facility" }).select().single();
		td.facilityId = facility!.id;

		const { data: owner } = await td.admin.auth.admin.createUser({ email: `owner-${Date.now()}@test.com`, password: "Test123!", email_confirm: true });
		td.ownerId = owner.user!.id;
		await td.admin.from("memberships").insert({ user_id: owner.user!.id, tenant_id: tenant!.id, role: "owner", is_primary: true });
	});

	afterAll(async () => {
		if (td.admin && td.tenantId) {
			await td.admin.from("tenants").delete().eq("id", td.tenantId);
			if (td.ownerId) await td.admin.auth.admin.deleteUser(td.ownerId);
		}
	});

	describe("updated_at trigger", () => {
		it("updates timestamp on change", async () => {
			const { data: before } = await td.admin!.from("tenants").select("updated_at").eq("id", td.tenantId!).single();
			await new Promise(r => setTimeout(r, 100));
			await td.admin!.from("tenants").update({ name: `Updated ${Date.now()}` }).eq("id", td.tenantId!);
			const { data: after } = await td.admin!.from("tenants").select("updated_at").eq("id", td.tenantId!).single();
			expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(new Date(before!.updated_at).getTime());
		});
	});

	describe("stock management trigger", () => {
		let productId: string, orderId: string;
		const initialStock = 100;

		beforeEach(async () => {
			const { data: product } = await td.admin!.from("products").insert({ facility_id: td.facilityId!, name: `P${Date.now()}`, price: 10, stock_quantity: initialStock, track_inventory: true }).select().single();
			productId = product!.id;
			const { data: order } = await td.admin!.from("orders").insert({ facility_id: td.facilityId!, created_by: td.ownerId! }).select().single();
			orderId = order!.id;
		});

		it("decreases stock on order item insert", async () => {
			await td.admin!.from("order_items").insert({ order_id: orderId, product_id: productId, product_name: "X", quantity: 5, unit_price: 10, line_total: 50 });
			const { data } = await td.admin!.from("products").select("stock_quantity").eq("id", productId).single();
			expect(data!.stock_quantity).toBe(initialStock - 5);
		});

		it("restores stock on soft delete", async () => {
			const { data: item } = await td.admin!.from("order_items").insert({ order_id: orderId, product_id: productId, product_name: "X", quantity: 5, unit_price: 10, line_total: 50 }).select().single();
			await td.admin!.from("order_items").update({ is_deleted: true }).eq("id", item!.id);
			const { data } = await td.admin!.from("products").select("stock_quantity").eq("id", productId).single();
			expect(data!.stock_quantity).toBe(initialStock);
		});

		it("ignores non-tracked products", async () => {
			const { data: p } = await td.admin!.from("products").insert({ facility_id: td.facilityId!, name: `NT${Date.now()}`, price: 5, stock_quantity: 50, track_inventory: false }).select().single();
			await td.admin!.from("order_items").insert({ order_id: orderId, product_id: p!.id, product_name: "X", quantity: 10, unit_price: 5, line_total: 50 });
			const { data } = await td.admin!.from("products").select("stock_quantity").eq("id", p!.id).single();
			expect(data!.stock_quantity).toBe(50);
		});
	});

	describe("schema constraints", () => {
		it.each([
			["unique tenant slug", () => td.admin!.from("tenants").insert({ name: "X", slug: `dup-${Date.now()}` }).then(() => td.admin!.from("tenants").insert({ name: "Y", slug: `dup-${Date.now()}` }))],
			["slug format", () => td.admin!.from("tenants").insert({ name: "X", slug: "Invalid Slug!" })],
			["positive price", () => td.admin!.from("products").insert({ facility_id: td.facilityId!, name: `N${Date.now()}`, price: -5 })],
			["booking end > start", () => td.admin!.from("bookings").insert({ facility_id: td.facilityId!, type: "event", customer_name: "X", starts_at: new Date().toISOString(), ends_at: new Date(Date.now() - 3600000).toISOString(), created_by: td.ownerId! })],
		])("enforces %s", async (_, fn) => {
			const result = await fn();
			expect(result.error).toBeDefined();
		});
	});

	describe("booking validation trigger", () => {
		it("requires field_number for football", async () => {
			const { error } = await td.admin!.from("bookings").insert({ facility_id: td.facilityId!, type: "football", customer_name: "X", starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 3600000).toISOString(), created_by: td.ownerId!, details: {} });
			expect(error?.message).toContain("field_number");
		});

		it("requires num_children for birthday", async () => {
			const { error } = await td.admin!.from("bookings").insert({ facility_id: td.facilityId!, type: "birthday", customer_name: "X", starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 3600000).toISOString(), created_by: td.ownerId!, details: {} });
			expect(error?.message).toContain("num_children");
		});

		it("allows event without special details", async () => {
			const { error } = await td.admin!.from("bookings").insert({ facility_id: td.facilityId!, type: "event", customer_name: "X", starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 3600000).toISOString(), created_by: td.ownerId!, details: {} });
			expect(error).toBeNull();
		});
	});

	describe("RLS policies", () => {
		it("service role can access all tenants", async () => {
			const { data, error } = await td.admin!.from("tenants").select("*");
			expect(error).toBeNull();
			expect(data!.length).toBeGreaterThan(0);
		});
	});
});
