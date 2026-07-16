import { json, type RequestHandler } from "@sveltejs/kit";
import { z } from "zod";

const AuthCallbackSchema = z.object({
	event: z.string().optional(),
	session: z
		.object({
			access_token: z.string(),
			refresh_token: z.string(),
		})
		.nullable()
		.optional(),
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const parsed = AuthCallbackSchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success)
		return json({ success: false, error: "Invalid request body" }, { status: 400 });
	const { event, session } = parsed.data;

	if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
		if (!session)
			return json({ success: false, error: "Missing session payload" }, { status: 400 });
		try {
			const { error } = await locals.supabase.auth.setSession({
				access_token: session.access_token,
				refresh_token: session.refresh_token,
			});
			if (error) return json({ success: false, error: error.message }, { status: 401 });
		} catch (err) {
			return json(
				{ success: false, error: err instanceof Error ? err.message : "Session setup failed" },
				{ status: 401 },
			);
		}
	} else if (event === "SIGNED_OUT") {
		const { error } = await locals.supabase.auth.signOut();
		if (error) return json({ success: false, error: error.message }, { status: 500 });
	}

	return json({ success: true });
};
