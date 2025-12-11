/**
 * Test Utilities and Mock Factories
 * Senior-level test infrastructure for ClubOS
 */

/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { vi, expect } from "vitest";
import type { User, Session } from "@supabase/supabase-js";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MockUser {
	id: string;
	email: string;
	role?: "owner" | "admin" | "manager" | "staff";
	tenantId?: string;
	facilityId?: string;
}

export interface MockSubscription {
	tenantId: string;
	status: "trialing" | "active" | "canceled" | "past_due" | "unpaid" | "paused";
	trialEnd?: Date;
	currentPeriodEnd?: Date;
	stripeCustomerId?: string;
	stripeSubscriptionId?: string;
}

export interface MockTenant {
	id: string;
	name: string;
	slug: string;
}

export interface MockFacility {
	id: string;
	tenantId: string;
	name: string;
}

export interface MockMembership {
	userId: string;
	tenantId: string;
	facilityId: string | null;
	role: "owner" | "admin" | "manager" | "staff";
	isPrimary: boolean;
}

// ============================================================================
// ID GENERATORS
// ============================================================================

let idCounter = 0;

export const generateId = (): string => {
	idCounter++;
	return `test-uuid-${idCounter}-${Date.now()}`;
};

export const resetIdCounter = (): void => {
	idCounter = 0;
};

// ============================================================================
// DATA FACTORIES
// ============================================================================

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

export const createMockFacility = (
	tenantId: string,
	overrides: Partial<Omit<MockFacility, "tenantId">> = {}
): MockFacility => ({
	id: generateId(),
	tenantId,
	name: `Test Facility ${Date.now()}`,
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
	
	return {
		tenantId,
		status: "trialing",
		trialEnd,
		currentPeriodEnd: trialEnd,
		...overrides,
	};
};

export const createAuthUser = (mockUser: MockUser): User => ({
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

export const createAuthSession = (user: User): Session => ({
	access_token: `mock-access-token-${Date.now()}`,
	refresh_token: `mock-refresh-token-${Date.now()}`,
	expires_in: 3600,
	expires_at: Math.floor(Date.now() / 1000) + 3600,
	token_type: "bearer",
	user,
});

// ============================================================================
// SUPABASE MOCK FACTORY
// ============================================================================

export interface SupabaseMockConfig {
	user?: MockUser | null;
	memberships?: MockMembership[];
	subscriptions?: MockSubscription[];
	tenants?: MockTenant[];
	facilities?: MockFacility[];
}

export interface MockQueryBuilder {
	select: ReturnType<typeof vi.fn>;
	insert: ReturnType<typeof vi.fn>;
	update: ReturnType<typeof vi.fn>;
	upsert: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
	eq: ReturnType<typeof vi.fn>;
	neq: ReturnType<typeof vi.fn>;
	gt: ReturnType<typeof vi.fn>;
	gte: ReturnType<typeof vi.fn>;
	lt: ReturnType<typeof vi.fn>;
	lte: ReturnType<typeof vi.fn>;
	like: ReturnType<typeof vi.fn>;
	ilike: ReturnType<typeof vi.fn>;
	is: ReturnType<typeof vi.fn>;
	in: ReturnType<typeof vi.fn>;
	order: ReturnType<typeof vi.fn>;
	limit: ReturnType<typeof vi.fn>;
	single: ReturnType<typeof vi.fn>;
	maybeSingle: ReturnType<typeof vi.fn>;
}

export const createSupabaseMock = (config: SupabaseMockConfig = {}) => {
	const { user, memberships = [], subscriptions = [], tenants = [], facilities = [] } = config;

	const authUser = user ? createAuthUser(user) : null;
	const session = authUser ? createAuthSession(authUser) : null;

	// Create chainable query builder
	const createQueryBuilder = (tableName: string): MockQueryBuilder => {
		let currentData: unknown[] = [];
		let filters: Array<{ column: string; op: string; value: unknown }> = [];

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
						stripe_customer_id: s.stripeCustomerId,
						stripe_subscription_id: s.stripeSubscriptionId,
					}));
				case "tenants":
					return tenants.map((t) => ({
						id: t.id,
						name: t.name,
						slug: t.slug,
					}));
				case "facilities":
					return facilities.map((f) => ({
						id: f.id,
						tenant_id: f.tenantId,
						name: f.name,
					}));
				default:
					return [];
			}
		};

		const applyFilters = (data: unknown[]) => {
			return data.filter((row) => {
				return filters.every(({ column, op, value }) => {
					const rowValue = (row as Record<string, unknown>)[column];
					switch (op) {
						case "eq":
							return rowValue === value;
						case "neq":
							return rowValue !== value;
						case "in":
							return Array.isArray(value) && value.includes(rowValue);
						default:
							return true;
					}
				});
			});
		};

		const builder: MockQueryBuilder = {
			select: vi.fn().mockImplementation(() => {
				currentData = getTableData();
				return builder;
			}),
			insert: vi.fn().mockImplementation((data) => {
				currentData = Array.isArray(data) ? data : [data];
				return builder;
			}),
			update: vi.fn().mockImplementation(() => builder),
			upsert: vi.fn().mockImplementation((data) => {
				currentData = Array.isArray(data) ? data : [data];
				return builder;
			}),
			delete: vi.fn().mockImplementation(() => builder),
			eq: vi.fn().mockImplementation((column, value) => {
				filters.push({ column, op: "eq", value });
				return builder;
			}),
			neq: vi.fn().mockImplementation((column, value) => {
				filters.push({ column, op: "neq", value });
				return builder;
			}),
			gt: vi.fn().mockImplementation(() => builder),
			gte: vi.fn().mockImplementation(() => builder),
			lt: vi.fn().mockImplementation(() => builder),
			lte: vi.fn().mockImplementation(() => builder),
			like: vi.fn().mockImplementation(() => builder),
			ilike: vi.fn().mockImplementation(() => builder),
			is: vi.fn().mockImplementation(() => builder),
			in: vi.fn().mockImplementation((column, values) => {
				filters.push({ column, op: "in", value: values });
				return builder;
			}),
			order: vi.fn().mockImplementation(() => builder),
			limit: vi.fn().mockImplementation(() => builder),
			single: vi.fn().mockImplementation(() => {
				const filtered = applyFilters(currentData.length ? currentData : getTableData());
				filters = [];
				return Promise.resolve({
					data: filtered[0] || null,
					error: filtered[0] ? null : { message: "No rows found", code: "PGRST116" },
				});
			}),
			maybeSingle: vi.fn().mockImplementation(() => {
				const filtered = applyFilters(currentData.length ? currentData : getTableData());
				filters = [];
				return Promise.resolve({
					data: filtered[0] || null,
					error: null,
				});
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
// STRIPE MOCK FACTORY
// ============================================================================

export interface StripeMockConfig {
	customerId?: string;
	subscriptionId?: string;
	sessionId?: string;
	shouldFail?: boolean;
	failureMessage?: string;
}

export const createStripeMock = (config: StripeMockConfig = {}) => {
	const {
		customerId = `cus_test_${Date.now()}`,
		subscriptionId = `sub_test_${Date.now()}`,
		sessionId = `cs_test_${Date.now()}`,
		shouldFail = false,
		failureMessage = "Stripe API error",
	} = config;

	return {
		customers: {
			create: vi.fn().mockImplementation(() =>
				shouldFail
					? Promise.reject(new Error(failureMessage))
					: Promise.resolve({ id: customerId, email: "test@example.com" })
			),
			retrieve: vi.fn().mockImplementation(() =>
				shouldFail
					? Promise.reject(new Error(failureMessage))
					: Promise.resolve({ id: customerId, email: "test@example.com" })
			),
		},
		checkout: {
			sessions: {
				create: vi.fn().mockImplementation(() =>
					shouldFail
						? Promise.reject(new Error(failureMessage))
						: Promise.resolve({
								id: sessionId,
								url: `https://checkout.stripe.com/pay/${sessionId}`,
								customer: customerId,
								subscription: subscriptionId,
						  })
				),
				retrieve: vi.fn().mockImplementation(() =>
					shouldFail
						? Promise.reject(new Error(failureMessage))
						: Promise.resolve({
								id: sessionId,
								customer: customerId,
								subscription: {
									id: subscriptionId,
									status: "active",
									current_period_start: Math.floor(Date.now() / 1000),
									current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
									items: {
										data: [{ price: { id: "price_test", nickname: "Pro" } }],
									},
									metadata: { tenant_id: "test-tenant-id" },
									cancel_at_period_end: false,
									trial_start: null,
									trial_end: null,
								},
						  })
				),
			},
		},
		subscriptions: {
			retrieve: vi.fn().mockImplementation(() =>
				shouldFail
					? Promise.reject(new Error(failureMessage))
					: Promise.resolve({
							id: subscriptionId,
							status: "active",
							customer: customerId,
							current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
					  })
			),
			update: vi.fn().mockImplementation(() =>
				shouldFail
					? Promise.reject(new Error(failureMessage))
					: Promise.resolve({ id: subscriptionId, status: "active" })
			),
			cancel: vi.fn().mockImplementation(() =>
				shouldFail
					? Promise.reject(new Error(failureMessage))
					: Promise.resolve({ id: subscriptionId, status: "canceled" })
			),
		},
	};
};

// ============================================================================
// REQUEST/RESPONSE HELPERS
// ============================================================================

export interface MockRequestOptions {
	method?: string;
	body?: unknown;
	headers?: Record<string, string>;
	url?: string;
}

export const createMockRequest = (options: MockRequestOptions = {}): Request => {
	const { method = "GET", body, headers = {}, url = "http://localhost:5173" } = options;

	const requestInit: RequestInit = {
		method,
		headers: {
			"Content-Type": "application/json",
			origin: "http://localhost:5173",
			...headers,
		},
	};

	if (body && method !== "GET") {
		requestInit.body = JSON.stringify(body);
	}

	return new Request(url, requestInit);
};

export interface MockLocals {
	user: User | null;
	session: Session | null;
	supabase: ReturnType<typeof createSupabaseMock>;
}

export const createMockLocals = (config: SupabaseMockConfig = {}): MockLocals => {
	const supabase = createSupabaseMock(config);
	const user = config.user ? createAuthUser(config.user) : null;
	const session = user ? createAuthSession(user) : null;

	return {
		user,
		session,
		supabase,
	};
};

export interface MockEventOptions {
	request?: MockRequestOptions;
	locals?: SupabaseMockConfig;
	url?: string;
	params?: Record<string, string>;
}

export const createMockEvent = (options: MockEventOptions = {}) => {
	const { request: requestOptions = {}, locals: localsConfig = {}, url, params = {} } = options;

	const fullUrl = url || requestOptions.url || "http://localhost:5173";
	const request = createMockRequest({ ...requestOptions, url: fullUrl });
	const locals = createMockLocals(localsConfig);

	return {
		request,
		locals,
		url: new URL(fullUrl),
		params,
		cookies: {
			get: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
			getAll: vi.fn().mockReturnValue([]),
			serialize: vi.fn(),
		},
		fetch: vi.fn(),
		getClientAddress: vi.fn().mockReturnValue("127.0.0.1"),
		platform: undefined,
		isDataRequest: false,
		isSubRequest: false,
		setHeaders: vi.fn(),
	};
};

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

export const expectJsonResponse = async (
	response: Response,
	expectedStatus: number,
	expectedBody?: Record<string, unknown>
): Promise<void> => {
	expect(response.status).toBe(expectedStatus);
	expect(response.headers.get("content-type")).toContain("application/json");

	if (expectedBody) {
		const body = await response.json();
		expect(body).toMatchObject(expectedBody);
	}
};

export const expectRedirect = (response: Response, expectedLocation: string): void => {
	expect(response.status).toBeGreaterThanOrEqual(300);
	expect(response.status).toBeLessThan(400);
	expect(response.headers.get("location")).toBe(expectedLocation);
};

// ============================================================================
// TEST DATA SCENARIOS
// ============================================================================

export const scenarios = {
	/** Unauthenticated user */
	unauthenticated: (): SupabaseMockConfig => ({}),

	/** Authenticated user without tenant (needs onboarding) */
	needsOnboarding: (): SupabaseMockConfig => ({
		user: createMockUser(),
	}),

	/** Authenticated user with expired trial */
	expiredTrial: (): SupabaseMockConfig => {
		const user = createMockUser({ role: "owner" });
		const tenant = createMockTenant();
		const expiredDate = new Date();
		expiredDate.setDate(expiredDate.getDate() - 1);

		return {
			user,
			tenants: [tenant],
			memberships: [createMockMembership(user.id, tenant.id, { role: "owner", isPrimary: true })],
			subscriptions: [
				createMockSubscription(tenant.id, {
					status: "trialing",
					trialEnd: expiredDate,
					currentPeriodEnd: expiredDate,
				}),
			],
		};
	},

	/** Authenticated user with active subscription */
	activeSubscription: (role: MockMembership["role"] = "owner"): SupabaseMockConfig => {
		const user = createMockUser({ role });
		const tenant = createMockTenant();
		const facility = createMockFacility(tenant.id);
		const futureDate = new Date();
		futureDate.setDate(futureDate.getDate() + 30);

		return {
			user,
			tenants: [tenant],
			facilities: [facility],
			memberships: [createMockMembership(user.id, tenant.id, { role, isPrimary: true })],
			subscriptions: [
				createMockSubscription(tenant.id, {
					status: "active",
					currentPeriodEnd: futureDate,
				}),
			],
		};
	},

	/** Active trial subscription */
	activeTrial: (role: MockMembership["role"] = "owner"): SupabaseMockConfig => {
		const user = createMockUser({ role });
		const tenant = createMockTenant();
		const facility = createMockFacility(tenant.id);
		const futureDate = new Date();
		futureDate.setDate(futureDate.getDate() + 14);

		return {
			user,
			tenants: [tenant],
			facilities: [facility],
			memberships: [createMockMembership(user.id, tenant.id, { role, isPrimary: true })],
			subscriptions: [
				createMockSubscription(tenant.id, {
					status: "trialing",
					trialEnd: futureDate,
					currentPeriodEnd: futureDate,
				}),
			],
		};
	},
};
