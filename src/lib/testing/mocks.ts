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

export interface MockUserCtx {
	membership: MockMembership;
	subscription: {
		status: SubscriptionStatus;
		trialEnd: string | null;
		currentPeriodEnd: string | null;
	} | null;
	tenant: { id: string; name: string; settings: Record<string, unknown> } | null;
	profile: { fullName: string };
	activeSession: unknown;
}

function buildUserCtx(
	_user: MockUser,
	memberships: MockMembership[],
	subscriptions: MockSubscription[],
	tenants: MockTenant[],
): MockUserCtx | null {
	const primary = memberships[0];
	if (!primary) return null;
	const subscription = subscriptions.find((s) => s.tenantId === primary.tenantId) ?? null;
	const tenant = tenants.find((t) => t.id === primary.tenantId) ?? null;
	return {
		membership: {
			userId: primary.userId,
			role: primary.role,
			tenantId: primary.tenantId,
			facilityId: primary.facilityId,
			isPrimary: primary.isPrimary,
		},
		subscription: subscription
			? {
					status: subscription.status,
					trialEnd: subscription.trialEnd?.toISOString() ?? null,
					currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
				}
			: null,
		tenant: tenant ? { id: tenant.id, name: tenant.name, settings: {} } : null,
		profile: { fullName: "Test User" },
		activeSession: null,
	};
}

export interface ClerkMockConfig {
	user?: MockUser | null;
	memberships?: MockMembership[];
	subscriptions?: MockSubscription[];
	tenants?: MockTenant[];
}

export const createClerkMock = (
	config: ClerkMockConfig = {},
): {
	auth: () => Promise<{ userId: string | null }>;
	users: {
		getUser: ReturnType<typeof vi.fn>;
	};
} => {
	const { user } = config;
	return {
		auth: vi.fn().mockResolvedValue({ userId: user?.id ?? null }),
		users: {
			getUser: vi.fn().mockResolvedValue(
				user
					? {
							id: user.id,
							emailAddresses: [{ emailAddress: user.email }],
							firstName: "Test",
							lastName: "User",
						}
					: null,
			),
		},
	};
};

export const createMockLocals = (config: ClerkMockConfig = {}): Record<string, unknown> => {
	const { user, memberships = [], subscriptions = [], tenants = [] } = config;
	const ctx = user ? buildUserCtx(user, memberships, subscriptions, tenants) : null;
	return {
		userId: user?.id ?? null,
		userCtx: ctx,
	};
};

const buildScenario = (
	role: MemberRole,
	subOverrides: Partial<Omit<MockSubscription, "tenantId">> = {},
): ClerkMockConfig => {
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
	unauthenticated: (): ClerkMockConfig => ({}),
	needsOnboarding: (): ClerkMockConfig => ({ user: createMockUser() }),
	expiredTrial: (): ClerkMockConfig =>
		buildScenario("owner", { trialEnd: futureDate(-1), currentPeriodEnd: futureDate(-1) }),
	activeSubscription: (role: MemberRole = "owner"): ClerkMockConfig =>
		buildScenario(role, { status: "active", currentPeriodEnd: futureDate(30) }),
};
