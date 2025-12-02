import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ locals }) => {
	await locals.supabase.auth.signOut();
	throw redirect(307, "/");
};

export const POST: RequestHandler = async ({ locals }) => {
	await locals.supabase.auth.signOut();
	throw redirect(307, "/");
};
