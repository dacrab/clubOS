/**
 * Test Utilities and Mock Factories
 */

/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { vi } from "vitest";
import type { User, Session } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export interface MockUser {
	id: string;
	email: string;
	role?: "owner" | "admin" | "manager" | "staff";
}

export interface MockTenant {
	id: string;
	name: string;
	slug: string;
}

export interface MockMembership {
	userId: string;
	tenantId: string;
	facilityId: string | null;
	role: "owner" | "admin" | "manager" | "staff";
	isPrimary: boolean;
}

export interface MockSubscription {
	tenantId: string;
	status: "trialing" | "active" | "canceled" | "past_due" | "unpaid" | "paused";
	trialEnd?: Date;
	currentPeriodEnd?: Date;
	stripeCustomerId?: string;
	stripeSubscriptionId?: string;
}

// ============================================================================
// FACTORIES
// ============================================================================

let idCounter = 0;
export const generateId = (): string => `test-uuid-${++idCounter}-${Date.now()}`;
export const resetIdCounter = (): void => { idCounter = 0; };

export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
	id: generateId(),
	email: `test-${Date.now()}@example.com`,
	role: "staff",
	...overrides,
});

export const createMockTenant = (overrides: Partial<MockTenant> = {}): MockTenant => ({
	id: generateId(),
	name: `Test Tenant ${Date.now()}`,
	slug: `test-tenant-${Date.now()}`,
	...overrides,
});

export const createMockMembership = (
	userId: string,
	tenantId: string,
	overrides: Partial<Omit<MockMembership, "userId" | "tenantId">> = {}
): MockMembership => ({
	userId,
	tenantId,
	facilityId: null,
	role: "staff",
	isPrimary: false,
	...overrides,
});

export const createMockSubscription = (
	tenantId: string,
	overrides: Partial<Omit<MockSubscription, "tenantId">> = {}
): MockSubscription => {
	const trialEnd = new Date();
	trialEnd.setDate(trialEnd.getDate() + 14);
	return { tenantId, status: "trialing", trialEnd, currentPeriodEnd: trialEnd, ...overrides };
};

const createAuthUser = (mockUser: MockUser): User => ({
	id: mockUser.id,
	email: mockUser.email,
	aud: "authenticated",
	role: "authenticated",
	email_confirmed_at: new Date().toISOString(),
	phone: "",
	confirmed_at: new Date().toISOString(),
	last_sign_in_at: new Date().toISOString(),
	app_metadata: { provider: "email", providers: ["email"] },
	user_metadata: { full_name: "Test User" },
	identities: [],
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
});

const createAuthSession = (user: User): Session => ({
	access_token: `mock-access-token-${Date.now()}`,
	refresh_token: `mock-refresh-token-${Date.now()}`,
	expires_in: 3600,
	expires_at: Math.floor(Date.now() / 1000) + 3600,
	token_type: "bearer",
	user,
});

// ============================================================================
// SUPABASE MOCK
// ============================================================================

export interface SupabaseMockConfig {
	user?: MockUser | null;
	memberships?: MockMembership[];
	subscriptions?: MockSubscription[];
	tenants?: MockTenant[];
}

export const createSupabaseMock = (config: SupabaseMockConfig = {}) => {
	const { user, memberships = [], subscriptions = [], tenants = [] } = config;
	const authUser = user ? createAuthUser(user) : null;
	const session = authUser ? createAuthSession(authUser) : null;

	const createQueryBuilder = (tableName: string) => {
		let filters: Array<{ column: string; value: unknown }> = [];

		const getTableData = () => {
			switch (tableName) {
				case "memberships":
					return memberships.map((m) => ({
						user_id: m.userId,
						tenant_id: m.tenantId,
						facility_id: m.facilityId,
						role: m.role,
						is_primary: m.isPrimary,
					}));
				case "subscriptions":
					return subscriptions.map((s) => ({
						tenant_id: s.tenantId,
						status: s.status,
						trial_end: s.trialEnd?.toISOString(),
						current_period_end: s.currentPeriodEnd?.toISOString(),
					}));
				case "tenants":
					return tenants.map((t) => ({ id: t.id, name: t.name, slug: t.slug }));
				default:
					return [];
			}
		};

		const applyFilters = (data: unknown[]) =>
			data.filter((row) =>
				filters.every(({ column, value }) => (row as Record<string, unknown>)[column] === value)
			);

		const builder = {
			select: vi.fn().mockReturnThis(),
			insert: vi.fn().mockReturnThis(),
			update: vi.fn().mockReturnThis(),
			upsert: vi.fn().mockReturnThis(),
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockImplementation((col, val) => {
				filters.push({ column: col, value: val });
				return builder;
			}),
			neq: vi.fn().mockReturnThis(),
			in: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			single: vi.fn().mockImplementation(() => {
				const filtered = applyFilters(getTableData());
				filters = [];
				return Promise.resolve({
					data: filtered[0] || null,
					error: filtered[0] ? null : { message: "No rows found", code: "PGRST116" },
				});
			}),
			maybeSingle: vi.fn().mockImplementation(() => {
				const filtered = applyFilters(getTableData());
				filters = [];
				return Promise.resolve({ data: filtered[0] || null, error: null });
			}),
		};
		return builder;
	};

	return {
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user: authUser }, error: null }),
			getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
			signInWithPassword: vi.fn().mockResolvedValue({ data: { user: authUser, session }, error: null }),
			signUp: vi.fn().mockResolvedValue({ data: { user: authUser, session }, error: null }),
			signOut: vi.fn().mockResolvedValue({ error: null }),
			admin: {
				createUser: vi.fn().mockResolvedValue({ data: { user: authUser }, error: null }),
				deleteUser: vi.fn().mockResolvedValue({ error: null }),
				listUsers: vi.fn().mockResolvedValue({ data: { users: authUser ? [authUser] : [] }, error: null }),
			},
		},
		from: vi.fn().mockImplementation((table: string) => createQueryBuilder(table)),
	};
};

// ============================================================================
// REQUEST/LOCALS HELPERS
// ============================================================================

export const createMockRequest = (options: { method?: string; body?: unknown; url?: string; headers?: Record<string, string> } = {}): Request => {
	const { method = "GET", body, url = "http://localhost:5173", headers = {} } = options;
	const init: RequestInit = { method, headers: { "Content-Type": "application/json", origin: "http://localhost:5173", ...headers } };
	if (body && method !== "GET") init.body = JSON.stringify(body);
	return new Request(url, init);
};

export const createMockLocals = (config: SupabaseMockConfig = {}) => {
	const supabase = createSupabaseMock(config);
	const user = config.user ? createAuthUser(config.user) : null;
	const session = user ? createAuthSession(user) : null;
	return { user, session, supabase };
};

// ============================================================================
// TEST SCENARIOS
// ============================================================================

export const scenarios = {
	unauthenticated: (): SupabaseMockConfig => ({}),

	needsOnboarding: (): SupabaseMockConfig => ({ user: createMockUser() }),

	expiredTrial: (): SupabaseMockConfig => {
		const user = createMockUser({ role: "owner" });
		const tenant = createMockTenant();
		const expired = new Date();
		expired.setDate(expired.getDate() - 1);
		return {
			user,
			tenants: [tenant],
			memberships: [createMockMembership(user.id, tenant.id, { role: "owner", isPrimary: true })],
			subscriptions: [createMockSubscription(tenant.id, { status: "trialing", trialEnd: expired, currentPeriodEnd: expired })],
		};
	},

	activeSubscription: (role: MockMembership["role"] = "owner"): SupabaseMockConfig => {
		const user = createMockUser({ role });
		const tenant = createMockTenant();
		const future = new Date();
		future.setDate(future.getDate() + 30);
		return {
			user,
			tenants: [tenant],
			memberships: [createMockMembership(user.id, tenant.id, { role, isPrimary: true })],
			subscriptions: [createMockSubscription(tenant.id, { status: "active", currentPeriodEnd: future })],
		};
	},

	activeTrial: (role: MockMembership["role"] = "owner"): SupabaseMockConfig => {
		const user = createMockUser({ role });
		const tenant = createMockTenant();
		const future = new Date();
		future.setDate(future.getDate() + 14);
		return {
			user,
			tenants: [tenant],
			memberships: [createMockMembership(user.id, tenant.id, { role, isPrimary: true })],
			subscriptions: [createMockSubscription(tenant.id, { status: "trialing", trialEnd: future, currentPeriodEnd: future })],
		};
	},
};
