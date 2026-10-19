import * as Sentry from "@sentry/sveltekit";
import type { HandleClientError } from "@sveltejs/kit/hooks";
import { PUBLIC_NODE_ENV, PUBLIC_SENTRY_DSN, PUBLIC_VERCEL_ENV } from "$app/env/public";

const SENTRY_DSN = PUBLIC_SENTRY_DSN;
const ENV = PUBLIC_VERCEL_ENV || PUBLIC_NODE_ENV || "development";

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
