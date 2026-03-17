import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request, locals }) => {
	const { event, session } = (await request.json()) as {
		event?: string;
		session?: { access_token: string; refresh_token: string } | null;
	};

	const supabase = locals.supabase;

	if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
		if (!session) return json({ success: false, error: "Missing session payload" }, { status: 400 });
		try {
			const { error } = await supabase.auth.setSession({
				access_token: session.access_token,
				refresh_token: session.refresh_token,
			});
			if (error) return json({ success: false, error: error.message }, { status: 401 });
		} catch (err) {
			return json({ success: false, error: err instanceof Error ? err.message : "Session setup failed" }, { status: 401 });
		}
	} else if (event === "SIGNED_OUT") {
		const { error } = await supabase.auth.signOut();
		if (error) return json({ success: false, error: error.message }, { status: 500 });
	}

	return json({ success: true });
};
