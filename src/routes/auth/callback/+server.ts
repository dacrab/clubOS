import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request, locals }) => {
	const { event, session } = (await request.json()) as {
		event?: string;
		session?: { access_token: string; refresh_token: string } | null;
	};

	const supabase = locals.supabase;

	if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
		if (session) {
			await supabase.auth.setSession({
				access_token: session.access_token,
				refresh_token: session.refresh_token,
			});
		}
	} else if (event === "SIGNED_OUT") {
		await supabase.auth.signOut();
	}

	return json({ success: true });
};
