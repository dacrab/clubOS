import type { MemberRole } from "$lib/types/database";

const ROLE_HOME: Record<MemberRole, string> = {
	owner: "/admin",
	admin: "/admin",
	manager: "/secretary",
	staff: "/staff",
};

export const getHomeForRole = (role: MemberRole | null): string =>
	role && role in ROLE_HOME ? ROLE_HOME[role] : "/";
