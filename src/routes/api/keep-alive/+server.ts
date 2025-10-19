import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { KEEP_ALIVE_CONFIG } from "$lib/config/keep-alive-config";
import {
  generateRandomString,
  pingEndpoint,
} from "$lib/server/keep-alive-helper";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";

type InsertDeleteStatus = "success" | "skipped" | "failed";

async function selectRandom(
  admin: SupabaseClient,
  table: string,
  searchColumn: string,
  randomString: string
): Promise<{ count: number; error?: string }> {
  const response = await admin
    .from(table)
    .select(searchColumn)
    .eq(searchColumn, randomString)
    .limit(1);
  if (response.error) {
    return { count: 0, error: response.error.message };
  }
  return { count: Array.isArray(response.data) ? response.data.length : 0 };
}

type InsertDeleteOptions = {
  admin: SupabaseClient;
  runInsertDelete: boolean;
  table: string;
  searchColumn: string;
  randomString: string;
};

async function maybeInsertDelete(
  options: InsertDeleteOptions
): Promise<{ insert: InsertDeleteStatus; delete: InsertDeleteStatus }> {
  const { admin, runInsertDelete, table, searchColumn, randomString } = options;
  if (!runInsertDelete) {
    return { insert: "skipped", delete: "skipped" };
  }

  const insertResponse = await admin
    .from(table)
    .insert({ [searchColumn]: randomString });
  const insert: InsertDeleteStatus = insertResponse.error
    ? "failed"
    : "success";

  const deleteResponse = await admin
    .from(table)
    .delete()
    .eq(searchColumn, randomString);
  const del: InsertDeleteStatus = deleteResponse.error ? "failed" : "success";

  return { insert, delete: del };
}

async function maybeList(
  admin: SupabaseClient,
  listCount: number,
  table: string,
  searchColumn: string
): Promise<unknown[] | undefined> {
  if (listCount <= 0) {
    return;
  }
  const listResponse = await admin
    .from(table)
    .select(searchColumn)
    .limit(listCount);
  if (listResponse.error) {
    return;
  }
  return listResponse.data as unknown[];
}

export const GET: RequestHandler = async () => {
  const { table, searchColumn, runInsertDelete, listCount, otherEndpoints } =
    KEEP_ALIVE_CONFIG;

  const randomString = generateRandomString();
  const admin = getSupabaseAdmin();

  const database: {
    selectCount?: number;
    insert?: InsertDeleteStatus;
    delete?: InsertDeleteStatus;
    list?: unknown[];
    error?: string;
  } = {};

  try {
    const selectResult = await selectRandom(
      admin,
      table,
      searchColumn,
      randomString
    );
    if (selectResult.error) {
      database.error = selectResult.error;
    } else {
      database.selectCount = selectResult.count;
    }

    const insertDelete = await maybeInsertDelete({
      admin,
      runInsertDelete,
      table,
      searchColumn,
      randomString,
    });
    database.insert = insertDelete.insert;
    database.delete = insertDelete.delete;

    const list = await maybeList(admin, listCount, table, searchColumn);
    if (list) {
      database.list = list;
    }
  } catch (error) {
    database.error =
      error instanceof Error ? error.message : "Unknown database error";
  }

  // 4) Ping other endpoints in parallel
  const endpointResults = await Promise.all(
    otherEndpoints.map((url) => pingEndpoint(url))
  );

  const body = {
    message: "Keep-alive executed",
    database,
    otherEndpoints: endpointResults,
  };

  return json(body, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
    },
  });
};
