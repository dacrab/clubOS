import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/lib/db/schema/*",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		// drizzle-kit fails with its own clear error when unset; we only assert the type here.
		url: process.env.DATABASE_URL as string,
	},
});
