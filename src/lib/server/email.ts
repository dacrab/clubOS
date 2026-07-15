import { error, json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";
import { generateBookingToken } from "$lib/server/token";

const RESEND_API_KEY = env.RESEND_API_KEY;

const FROM = env.EMAIL_FROM ?? "ClubOS <bookings@clubos.app>";

export function canSendEmail(): boolean {
	return !!RESEND_API_KEY;
}

export function requireEmailKey(): string {
	if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY env var — emails are disabled");
	return RESEND_API_KEY;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
	const apiKey = requireEmailKey();
	const res = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ from: FROM, to, subject, html }),
	});
	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Resend error ${res.status}: ${body}`);
	}
}

export function buildBookingEmailLines(booking: {
	customer_name: string;
	customer_phone: string | null;
	starts_at: string;
	type: string;
	notes: string | null;
}): string[] {
	return [
		`Customer: ${booking.customer_name}`,
		`Phone: ${booking.customer_phone ?? "—"}`,
		`Date: ${new Date(booking.starts_at).toLocaleString("en-GB", { timeZone: "Europe/Athens" })}`,
		`Type: ${booking.type}`,
		booking.notes ? `Notes: ${booking.notes}` : null,
	].filter(Boolean) as string[];
}

export function buildBookingEmailHtml(
	heading: string,
	bodyLines: string[],
	ctaUrl: string | null,
	ctaLabel: string | null,
): string {
	const cta =
		ctaUrl && ctaLabel
			? `<tr><td style="padding:24px 0"><a href="${ctaUrl}" style="display:inline-block;background:#1d9bf0;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">${ctaLabel}</a></td></tr>`
			: "";
	return `<!DOCTYPE html>
<table cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif">
<tr><td style="padding:32px 0 16px"><h1 style="margin:0;font-size:20px">${heading}</h1></td></tr>
${bodyLines.map((l) => `<tr><td style="padding:4px 0;color:#374151">${l}</td></tr>`).join("\n")}
${cta}
<tr><td style="padding:24px 0 0;font-size:12px;color:#9ca3af">ClubOS — automated booking notification</td></tr>
</table>`;
}

export async function sendBookingEmail(
	bookingId: string,
	subjectPrefix: string,
	heading: string,
	ctaLabel: string,
): Promise<Response> {
	if (!canSendEmail()) {
		return json({ sent: false, reason: "RESEND_API_KEY not configured" });
	}

	const admin = getSupabaseAdmin();
	const { data: booking } = await admin.from("bookings").select("*").eq("id", bookingId).single();
	if (!booking) throw error(404, "Booking not found");

	if (!booking.customer_email) {
		return json({ sent: false, reason: "No customer email on booking" });
	}

	const origin = env.ORIGIN ?? "http://localhost:5173";
	const manageUrl = `${origin}/booking/${booking.id}/manage?token=${generateBookingToken(booking.id)}`;

	await sendEmail(
		booking.customer_email,
		`${subjectPrefix} — ${booking.customer_name}`,
		buildBookingEmailHtml(heading, buildBookingEmailLines(booking), manageUrl, ctaLabel),
	);

	return json({ sent: true });
}
