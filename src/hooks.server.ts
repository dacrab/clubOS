import { createServerClient } from "@supabase/ssr";
import type { Handle, HandleServerError } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { env as publicEnv } from "$env/dynamic/public";

export const handle: Handle = async ({ event, resolve }) => {
	const {
		PUBLIC_SUPABASE_URL: url,
		PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: anon,
	} = publicEnv as {
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
		data: { session },
	} = await supabase.auth.getSession();
	event.locals.session = session ?? null;
	event.locals.user = session?.user ?? null;

	// Centralized guards (run before load)
	const path = event.url.pathname;
	const needsAuth =
		path.startsWith("/admin") ||
		path.startsWith("/staff") ||
		path.startsWith("/secretary");
	if (needsAuth && !event.locals.user) redirect(307, "/");

	// Role checks
	async function ensureRole(required: "admin" | "staff" | "secretary") {
		const u = event.locals.user;
		if (!u) redirect(307, "/");
		const metaRole = (u.user_metadata?.["role"] as string | undefined) ?? null;
		if (metaRole === required) return;
		if (metaRole == null) {
			const { data } = await supabase
				.from("users")
				.select("role")
				.eq("id", u.id)
				.single();
			if ((data?.role as string | undefined) !== required) redirect(307, "/");
			return;
		}
		redirect(307, "/");
	}

	if (path.startsWith("/admin")) {
		await ensureRole("admin");
	} else if (path.startsWith("/staff")) {
		await ensureRole("staff");
	} else if (path.startsWith("/secretary")) {
		// Allow admin to access secretary area if desired
		const u = event.locals.user;
		const metaRole = (u?.user_metadata?.["role"] as string | undefined) ?? null;
		if (metaRole === "secretary" || metaRole === "admin") {
			// ok
		} else if (metaRole == null && u) {
			const { data } = await supabase
				.from("users")
				.select("role")
				.eq("id", u.id)
				.single();
			const role = data?.role as string | undefined;
			if (!(role === "secretary" || role === "admin")) redirect(307, "/");
		} else {
			redirect(307, "/");
		}
	}

	return resolve(event);
};

export const handleError: HandleServerError = ({ message }) => {
	return { message };
};
