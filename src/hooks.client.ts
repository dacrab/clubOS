import * as Sentry from "@sentry/sveltekit";
import type { HandleClientError } from "@sveltejs/kit";

const SENTRY_DSN = process.env.SENTRY_DSN;
const ENV = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";

if (SENTRY_DSN) {
	Sentry.init({
		dsn: SENTRY_DSN,
		environment: ENV,
		tracesSampleRate: 0.1,
	});
}

export const handleError: HandleClientError | undefined = SENTRY_DSN
	? Sentry.handleErrorWithSentry()
	: undefined;
