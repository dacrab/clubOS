import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	const [{ data: products }, { data: categories }] = await Promise.all([
		supabase.from("products").select("*").order("name"),
		supabase.from("categories").select("*").order("name"),
	]);

	return {
		products: products ?? [],
		categories: categories ?? [],
	};
};
