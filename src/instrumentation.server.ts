import * as Sentry from "@sentry/sveltekit";

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
	tracesSampleRate: 0.1,
});
