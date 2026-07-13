import * as Sentry from "@sentry/sveltekit";
import type { HandleClientError } from "@sveltejs/kit";

const SENTRY_DSN = process.env.SENTRY_DSN;
const ENV = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";

if (!SENTRY_DSN) {
	throw new Error("Missing SENTRY_DSN environment variable");
}

Sentry.init({
	dsn: SENTRY_DSN,
	environment: ENV,
	tracesSampleRate: 0.1,
});

export const handleError = Sentry.handleErrorWithSentry() satisfies HandleClientError;
