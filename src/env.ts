import { defineEnvVars } from "@sveltejs/kit/env";

// These keep the previous `$env/dynamic/*` behaviour: missing values fall back to an empty string.
export const variables = defineEnvVars({
	PUBLIC_SENTRY_DSN: { public: true, schema: (input) => input ?? "" },
	PUBLIC_VERCEL_ENV: { public: true, schema: (input) => input ?? "" },
	PUBLIC_NODE_ENV: { public: true, schema: (input) => input ?? "" },
	POLAR_WEBHOOK_SECRET: { schema: (input) => input ?? "" },
	ORIGIN: { schema: (input) => input ?? "" },
	RESEND_API_KEY: { schema: (input) => input ?? "" },
	EMAIL_FROM: { schema: (input) => input ?? "" },
	POLAR_ACCESS_TOKEN: { schema: (input) => input ?? "" },
	UPSTASH_REDIS_REST_URL: { schema: (input) => input ?? "" },
	UPSTASH_REDIS_REST_TOKEN: { schema: (input) => input ?? "" },
	BOOKING_TOKEN_SECRET: { schema: (input) => input ?? "" },
	DATABASE_URL: { schema: (input) => input ?? "" },
});
