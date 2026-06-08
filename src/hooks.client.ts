import * as Sentry from "@sentry/sveltekit";
import type { HandleClientError } from "@sveltejs/kit";

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
	tracesSampleRate: 0.1,
});

export const handleError = Sentry.handleErrorWithSentry() satisfies HandleClientError;
