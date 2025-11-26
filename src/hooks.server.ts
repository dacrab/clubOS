import { createServerClient } from "@supabase/ssr";
import type { Handle } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { env as publicEnv } from "$env/dynamic/public";
import type { UserRole } from "$lib/types/database";

export const handle: Handle = async ({ event, resolve }) => {
	const { PUBLIC_SUPABASE_URL: url, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: anon } = publicEnv as {
		PUBLIC_SUPABASE_URL?: string;
		PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string;
	};

	if (!(url && anon)) throw new Error("Missing PUBLIC_SUPABASE env");

	const supabase = createServerClient(url, anon, {
		cookies: {
			get: (key: string) => event.cookies.get(key),
			set: (key: string, value: string, options?: Record<string, unknown>) =>
				event.cookies.set(key, value, {
					...options,
					httpOnly: true,
					sameSite: "lax",
					secure: event.url.protocol === "https:",
					path: "/",
				}),
			remove: (key: string, options?: Record<string, unknown>) =>
				event.cookies.delete(key, { ...options, path: "/" }),
		},
	});

	event.locals.supabase = supabase;

	const {
		data: { user },
	} = await supabase.auth.getUser();
	event.locals.user = user ?? null;

	const {
		data: { session },
	} = await supabase.auth.getSession();
	event.locals.session = session ?? null;

	const path = event.url.pathname;

	// Public routes
	const publicRoutes = ["/", "/login", "/reset", "/auth/callback", "/logout"];
	const isPublic = publicRoutes.some(
		(route) => path === route || path.startsWith("/api/")
	);

	// Redirect authenticated users from login page to their dashboard
	if (path === "/" && user) {
		const role = await getUserRole(supabase, user.id, user.user_metadata?.role as string | undefined);
		if (role) {
			throw redirect(307, getHomeForRole(role));
		}
	}

	// Protected routes require authentication
	if (!isPublic && !user) {
		throw redirect(307, "/");
	}

	// Role-based access control
	if (user && !isPublic) {
		const role = await getUserRole(supabase, user.id, user.user_metadata?.role as string | undefined);

		if (path.startsWith("/admin") && role !== "admin") {
			throw redirect(307, getHomeForRole(role));
		}

		if (path.startsWith("/secretary") && role !== "admin" && role !== "secretary") {
			throw redirect(307, getHomeForRole(role));
		}

		if (path.startsWith("/staff") && role !== "admin" && role !== "staff") {
			throw redirect(307, getHomeForRole(role));
		}
	}

	return resolve(event);
};

async function getUserRole(
	supabase: ReturnType<typeof createServerClient>,
	userId: string,
	metaRole?: string
): Promise<UserRole | null> {
	if (metaRole && ["admin", "secretary", "staff"].includes(metaRole)) {
		return metaRole as UserRole;
	}

	const { data } = await supabase
		.from("users")
		.select("role")
		.eq("id", userId)
		.single();

	return (data?.role as UserRole) ?? null;
}

function getHomeForRole(role: UserRole | null): string {
	switch (role) {
		case "admin":
			return "/admin";
		case "secretary":
			return "/secretary";
		case "staff":
			return "/staff";
		default:
			return "/";
	}
}
