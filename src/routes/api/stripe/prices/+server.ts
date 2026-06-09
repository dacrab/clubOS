import { json } from "@sveltejs/kit";
import { fetchPlansFromStripe } from "$lib/server/plans";

export async function GET() {
	const plans = await fetchPlansFromStripe();
	return json({ plans });
}
