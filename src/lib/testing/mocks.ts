import type { Session, User } from "@supabase/supabase-js";
import { vi } from "vitest";
import type { MemberRole, SubscriptionStatus } from "$lib/types/database";
import { DAY_MS } from "$lib/types/database";

export interface MockUser {
	id: string;
	email: string;
	role?: MemberRole;
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
	role: MemberRole;
	isPrimary: boolean;
}
export interface MockSubscription {
	tenantId: string;
	status: SubscriptionStatus;
	trialEnd?: Date;
	currentPeriodEnd?: Date;
	polarCustomerId?: string;
}

export const generateId = (): string => `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const futureDate = (days: number): Date => new Date(Date.now() + days * DAY_MS);

export const createMockUser = (o: Partial<MockUser> = {}): MockUser => ({
	id: generateId(),
	email: `test-${Date.now()}@example.com`,
	role: "staff",
	...o,
});

export const createMockTenant = (o: Partial<MockTenant> = {}): MockTenant => ({
	id: generateId(),
	name: `Tenant ${Date.now()}`,
	slug: `tenant-${Date.now()}`,
	...o,
});

export const createMockMembership = (
	userId: string,
	tenantId: string,
	o: Partial<Omit<MockMembership, "userId" | "tenantId">> = {},
): MockMembership => ({
	userId,
	tenantId,
	facilityId: null,
	role: "staff",
	isPrimary: false,
	...o,
});

export const createMockSubscription = (
	tenantId: string,
	o: Partial<Omit<MockSubscription, "tenantId">> = {},
): MockSubscription => ({
	tenantId,
	status: "trialing",
	trialEnd: futureDate(14),
	currentPeriodEnd: futureDate(14),
	...o,
});

export interface SupabaseMockConfig {
	user?: MockUser | null;
	memberships?: MockMembership[];
	subscriptions?: MockSubscription[];
	tenants?: MockTenant[];
}

const buildAuthUser = (u: MockUser): User => ({
	id: u.id,
	email: u.email,
	aud: "authenticated",
	role: "authenticated",
	email_confirmed_at: new Date().toISOString(),
	phone: "",
	confirmed_at: new Date().toISOString(),
	last_sign_in_at: new Date().toISOString(),
	app_metadata: {},
	user_metadata: { full_name: "Test" },
	identities: [],
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
});

export const createSupabaseMock = (
	config: SupabaseMockConfig = {},
): {
	auth: { getUser: ReturnType<typeof vi.fn>; getSession: ReturnType<typeof vi.fn> };
	from: ReturnType<typeof vi.fn>;
	rpc: ReturnType<typeof vi.fn>;
} => {
	const { user, memberships = [], subscriptions = [], tenants = [] } = config;
	const authUser = user ? buildAuthUser(user) : null;
	const session: Session | null = authUser
		? {
				access_token: `token-${Date.now()}`,
				refresh_token: `refresh-${Date.now()}`,
				expires_in: 3600,
				expires_at: Math.floor(Date.now() / 1000) + 3600,
				token_type: "bearer",
				user: authUser,
			}
		: null;

	const tableData: Record<string, () => Record<string, unknown>[]> = {
		memberships: () =>
			memberships.map((m) => ({
				user_id: m.userId,
				tenant_id: m.tenantId,
				facility_id: m.facilityId,
				role: m.role,
				is_primary: m.isPrimary,
			})),
		subscriptions: () =>
			subscriptions.map((s) => ({
				tenant_id: s.tenantId,
				status: s.status,
				polar_customer_id: s.polarCustomerId ?? null,
				trial_end: s.trialEnd?.toISOString(),
				current_period_end: s.currentPeriodEnd?.toISOString(),
			})),
		tenants: () => tenants.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
	};

	const createBuilder = (
		table: string,
	): {
		select: ReturnType<typeof vi.fn>;
		eq: ReturnType<typeof vi.fn>;
		order: ReturnType<typeof vi.fn>;
		limit: ReturnType<typeof vi.fn>;
		single: ReturnType<typeof vi.fn>;
		maybeSingle: ReturnType<typeof vi.fn>;
	} => {
		let filters: { col: string; val: unknown }[] = [];
		const fetchOne = (): Record<string, unknown> | null => {
			const rows = (tableData[table]?.() ?? []).filter((r: Record<string, unknown>) =>
				filters.every((f) => r[f.col] === f.val),
			);
			filters = [];
			return rows[0] ?? null;
		};
		const b = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn((c, v) => {
				filters.push({ col: c, val: v });
				return b;
			}),
			order: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			single: vi.fn(() => {
				const data = fetchOne();
				return Promise.resolve({ data, error: data ? null : { message: "Not found" } });
			}),
			maybeSingle: vi.fn(() => Promise.resolve({ data: fetchOne(), error: null })),
		};
		return b;
	};

	const primary = memberships[0] ?? null;
	const subscription = primary
		? (subscriptions.find((s) => s.tenantId === primary.tenantId) ?? null)
		: null;
	const tenant = primary ? (tenants.find((t) => t.id === primary.tenantId) ?? null) : null;

	const userContext = primary
		? {
				membership: {
					role: primary.role,
					tenantId: primary.tenantId,
					facilityId: primary.facilityId,
				},
				subscription: subscription
					? {
							status: subscription.status,
							trialEnd: subscription.trialEnd?.toISOString() ?? null,
							periodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
						}
					: null,
				tenant: tenant ? { id: tenant.id, name: tenant.name, settings: {} } : null,
				profile: { fullName: authUser?.user_metadata?.full_name ?? "Test" },
				activeSession: null,
			}
		: null;

	return {
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user: authUser }, error: null }),
			getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
		},
		from: vi.fn((t: string) => createBuilder(t)),
		rpc: vi.fn((fn: string) =>
			fn === "get_user_context"
				? Promise.resolve({ data: userContext, error: null })
				: Promise.resolve({ data: null, error: null }),
		),
	};
};

export const createMockRequest = (
	o: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Request => {
	const { method = "GET", body, headers = {} } = o;
	return new Request("http://localhost", {
		method,
		headers: { "Content-Type": "application/json", ...headers },
		...(body && method !== "GET" ? { body: JSON.stringify(body) } : {}),
	});
};

export const createMockLocals = (
	config: SupabaseMockConfig = {},
): {
	user: User | null;
	session: Session | null;
	supabase: ReturnType<typeof createSupabaseMock>;
} => {
	const supabase = createSupabaseMock(config);
	const authUser = config.user ? buildAuthUser(config.user) : null;
	return {
		user: authUser,
		session: authUser
			? {
					access_token: "x",
					refresh_token: "r",
					expires_in: 3600,
					token_type: "bearer",
					user: authUser,
				}
			: null,
		supabase,
	};
};

const buildScenario = (
	role: MemberRole,
	subOverrides: Partial<Omit<MockSubscription, "tenantId">> = {},
): SupabaseMockConfig => {
	const user = createMockUser({ role });
	const tenant = createMockTenant();
	return {
		user,
		tenants: [tenant],
		memberships: [createMockMembership(user.id, tenant.id, { role, isPrimary: true })],
		subscriptions: [createMockSubscription(tenant.id, subOverrides)],
	};
};

export const scenarios = {
	unauthenticated: (): SupabaseMockConfig => ({}),
	needsOnboarding: (): SupabaseMockConfig => ({ user: createMockUser() }),
	expiredTrial: (): SupabaseMockConfig =>
		buildScenario("owner", { trialEnd: futureDate(-1), currentPeriodEnd: futureDate(-1) }),
	activeSubscription: (role: MemberRole = "owner"): SupabaseMockConfig =>
		buildScenario(role, { status: "active", currentPeriodEnd: futureDate(30) }),
};
