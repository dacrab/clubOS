import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "$env/dynamic/private";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
	if (db) return db;
	const url = env.DATABASE_URL;
	if (!url) throw new Error("Missing DATABASE_URL");
	const client = postgres(url, {
		prepare: false,
		max: 10,
		idle_timeout: 20,
		max_lifetime: 60 * 30,
		connection: {
			application_name: "clubos",
		},
	});
	db = drizzle(client, { schema });
	return db;
}
