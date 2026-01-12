import { vi } from "vitest";
import type { User, Session } from "@supabase/supabase-js";

type Role = "owner" | "admin" | "manager" | "staff";
type SubStatus = "trialing" | "active" | "canceled" | "past_due" | "unpaid" | "paused";

export interface MockUser { id: string; email: string; role?: Role }
export interface MockTenant { id: string; name: string; slug: string }
export interface MockMembership { userId: string; tenantId: string; facilityId: string | null; role: Role; isPrimary: boolean }
export interface MockSubscription { tenantId: string; status: SubStatus; trialEnd?: Date; currentPeriodEnd?: Date; stripeCustomerId?: string }

export const generateId = () => `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const futureDate = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d; };
export const resetIdCounter = (): void => { /* no-op for backwards compat */ };

export const createMockUser = (o: Partial<MockUser> = {}): MockUser => ({ id: generateId(), email: `test-${Date.now()}@example.com`, role: "staff", ...o });
export const createMockTenant = (o: Partial<MockTenant> = {}): MockTenant => ({ id: generateId(), name: `Tenant ${Date.now()}`, slug: `tenant-${Date.now()}`, ...o });
export const createMockMembership = (userId: string, tenantId: string, o: Partial<Omit<MockMembership, "userId" | "tenantId">> = {}): MockMembership => ({ userId, tenantId, facilityId: null, role: "staff", isPrimary: false, ...o });
export const createMockSubscription = (tenantId: string, o: Partial<Omit<MockSubscription, "tenantId">> = {}): MockSubscription => ({ tenantId, status: "trialing", trialEnd: futureDate(14), currentPeriodEnd: futureDate(14), ...o });

export interface SupabaseMockConfig { user?: MockUser | null; memberships?: MockMembership[]; subscriptions?: MockSubscription[]; tenants?: MockTenant[] }

export const createSupabaseMock = (config: SupabaseMockConfig = {}) => {
	const { user, memberships = [], subscriptions = [], tenants = [] } = config;
	const authUser: User | null = user ? { id: user.id, email: user.email, aud: "authenticated", role: "authenticated", email_confirmed_at: new Date().toISOString(), phone: "", confirmed_at: new Date().toISOString(), last_sign_in_at: new Date().toISOString(), app_metadata: {}, user_metadata: { full_name: "Test" }, identities: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() } : null;
	const session: Session | null = authUser ? { access_token: `token-${Date.now()}`, refresh_token: `refresh-${Date.now()}`, expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: authUser } : null;

	const getData = (table: string) => {
		if (table === "memberships") return memberships.map(m => ({ user_id: m.userId, tenant_id: m.tenantId, facility_id: m.facilityId, role: m.role, is_primary: m.isPrimary }));
		if (table === "subscriptions") return subscriptions.map(s => ({ tenant_id: s.tenantId, status: s.status, trial_end: s.trialEnd?.toISOString(), current_period_end: s.currentPeriodEnd?.toISOString() }));
		if (table === "tenants") return tenants.map(t => ({ id: t.id, name: t.name, slug: t.slug }));
		return [];
	};

	const createBuilder = (table: string) => {
		let filters: Array<{ col: string; val: unknown }> = [];
		const b = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockImplementation((c, v) => { filters.push({ col: c, val: v }); return b; }),
			order: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			single: vi.fn().mockImplementation(() => { const data = getData(table).filter(r => filters.every(f => (r as Record<string, unknown>)[f.col] === f.val)); filters = []; return Promise.resolve({ data: data[0] || null, error: data[0] ? null : { message: "Not found" } }); }),
			maybeSingle: vi.fn().mockImplementation(() => { const data = getData(table).filter(r => filters.every(f => (r as Record<string, unknown>)[f.col] === f.val)); filters = []; return Promise.resolve({ data: data[0] || null, error: null }); }),
		};
		return b;
	};

	return {
		auth: { getUser: vi.fn().mockResolvedValue({ data: { user: authUser }, error: null }), getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }) },
		from: vi.fn().mockImplementation((t: string) => createBuilder(t)),
	};
};

export const createMockRequest = (o: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Request => {
	const { method = "GET", body, headers = {} } = o;
	return new Request("http://localhost", { method, headers: { "Content-Type": "application/json", ...headers }, ...(body && method !== "GET" ? { body: JSON.stringify(body) } : {}) });
};

export const createMockLocals = (config: SupabaseMockConfig = {}) => {
	const supabase = createSupabaseMock(config);
	const authUser = config.user ? { id: config.user.id, email: config.user.email, aud: "authenticated", role: "authenticated" } as User : null;
	return { user: authUser, session: authUser ? { access_token: "x", user: authUser } as Session : null, supabase };
};

export const scenarios = {
	unauthenticated: (): SupabaseMockConfig => ({}),
	needsOnboarding: (): SupabaseMockConfig => ({ user: createMockUser() }),
	expiredTrial: (): SupabaseMockConfig => { const user = createMockUser({ role: "owner" }), tenant = createMockTenant(); return { user, tenants: [tenant], memberships: [createMockMembership(user.id, tenant.id, { role: "owner", isPrimary: true })], subscriptions: [createMockSubscription(tenant.id, { trialEnd: futureDate(-1), currentPeriodEnd: futureDate(-1) })] }; },
	activeSubscription: (role: Role = "owner"): SupabaseMockConfig => { const user = createMockUser({ role }), tenant = createMockTenant(); return { user, tenants: [tenant], memberships: [createMockMembership(user.id, tenant.id, { role, isPrimary: true })], subscriptions: [createMockSubscription(tenant.id, { status: "active", currentPeriodEnd: futureDate(30) })] }; },
	activeTrial: (role: Role = "owner"): SupabaseMockConfig => { const user = createMockUser({ role }), tenant = createMockTenant(); return { user, tenants: [tenant], memberships: [createMockMembership(user.id, tenant.id, { role, isPrimary: true })], subscriptions: [createMockSubscription(tenant.id)] }; },
};
