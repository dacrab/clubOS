import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";

// Only POST — GET logout is a CSRF risk
export const POST: RequestHandler = async ({ locals }) => {
	await locals.supabase.auth.signOut();
	throw redirect(307, "/");
};
