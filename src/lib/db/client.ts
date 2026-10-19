import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DATABASE_URL } from "$app/env/private";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

export type DbClient = Db;

let db: Db | undefined;

export function getDb() {
	if (db) return db;
	const url = DATABASE_URL;
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

/** Either the root db handle or a transaction bound to it. */
export type TxOrDb = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];
