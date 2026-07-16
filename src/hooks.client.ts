import * as Sentry from "@sentry/sveltekit";
import type { HandleClientError } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";

const SENTRY_DSN = env.PUBLIC_SENTRY_DSN;
const ENV = env.PUBLIC_VERCEL_ENV || env.PUBLIC_NODE_ENV || "development";

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
