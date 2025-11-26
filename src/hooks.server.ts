import { createServerClient } from "@supabase/ssr";
import type { Handle } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { env as publicEnv } from "$env/dynamic/public";
import type { UserRole } from "$lib/types/database";

const publicRoutes = ["/", "/login", "/reset", "/auth/callback", "/logout"];
const getHome = (r: UserRole | null): string => r === "admin" ? "/admin" : r === "secretary" ? "/secretary" : r === "staff" ? "/staff" : "/";

export const handle: Handle = async ({ event, resolve }) => {
	const { PUBLIC_SUPABASE_URL: url, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: anon } = publicEnv as { PUBLIC_SUPABASE_URL?: string; PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string };
	if (!(url && anon)) throw new Error("Missing PUBLIC_SUPABASE env");

	const supabase = createServerClient(url, anon, {
		cookies: {
			get: (key: string) => event.cookies.get(key),
			set: (key: string, value: string, opts?: Record<string, unknown>) => event.cookies.set(key, value, { ...opts, httpOnly: true, sameSite: "lax", secure: event.url.protocol === "https:", path: "/" }),
			remove: (key: string, opts?: Record<string, unknown>) => event.cookies.delete(key, { ...opts, path: "/" }),
		},
	});

	event.locals.supabase = supabase;
	const { data: { user } } = await supabase.auth.getUser();
	const { data: { session } } = await supabase.auth.getSession();
	event.locals.user = user ?? null;
	event.locals.session = session ?? null;

	const path = event.url.pathname;
	const isPublic = publicRoutes.includes(path) || path.startsWith("/api/");

	const getRole = async (): Promise<UserRole | null> => {
		if (!user) return null;
		const meta = user.user_metadata?.role as string | undefined;
		if (meta && ["admin", "secretary", "staff"].includes(meta)) return meta as UserRole;
		const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
		return (data?.role as UserRole) ?? null;
	};

	if (path === "/" && user) { const role = await getRole(); if (role) throw redirect(307, getHome(role)); }
	if (!isPublic && !user) throw redirect(307, "/");

	if (user && !isPublic) {
		const role = await getRole();
		if (path.startsWith("/admin") && role !== "admin") throw redirect(307, getHome(role));
		if (path.startsWith("/secretary") && role !== "admin" && role !== "secretary") throw redirect(307, getHome(role));
		if (path.startsWith("/staff") && role !== "admin" && role !== "staff") throw redirect(307, getHome(role));
	}

	return resolve(event);
};
