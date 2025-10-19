import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { KEEP_ALIVE_CONFIG } from "$lib/config/keep-alive-config";
import {
  generateRandomString,
  pingEndpoint,
} from "$lib/server/keep-alive-helper";
import { supabaseAdmin } from "$lib/server/supabase-admin";

type InsertDeleteStatus = "success" | "skipped" | "failed";

async function selectRandom(
  table: string,
  searchColumn: string,
  randomString: string
): Promise<{ count: number; error?: string }> {
  const response = await supabaseAdmin
    .from(table)
    .select(searchColumn)
    .eq(searchColumn, randomString)
    .limit(1);
  if (response.error) {
    return { count: 0, error: response.error.message };
  }
  return { count: Array.isArray(response.data) ? response.data.length : 0 };
}

async function maybeInsertDelete(
  runInsertDelete: boolean,
  table: string,
  searchColumn: string,
  randomString: string
): Promise<{ insert: InsertDeleteStatus; delete: InsertDeleteStatus }> {
  if (!runInsertDelete) {
    return { insert: "skipped", delete: "skipped" };
  }

  const insertResponse = await supabaseAdmin
    .from(table)
    .insert({ [searchColumn]: randomString });
  const insert: InsertDeleteStatus = insertResponse.error
    ? "failed"
    : "success";

  const deleteResponse = await supabaseAdmin
    .from(table)
    .delete()
    .eq(searchColumn, randomString);
  const del: InsertDeleteStatus = deleteResponse.error ? "failed" : "success";

  return { insert, delete: del };
}

async function maybeList(
  listCount: number,
  table: string,
  searchColumn: string
): Promise<unknown[] | undefined> {
  if (listCount <= 0) {
    return;
  }
  const listResponse = await supabaseAdmin
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

  const database: {
    selectCount?: number;
    insert?: InsertDeleteStatus;
    delete?: InsertDeleteStatus;
    list?: unknown[];
    error?: string;
  } = {};

  try {
    const selectResult = await selectRandom(table, searchColumn, randomString);
    if (selectResult.error) {
      database.error = selectResult.error;
    } else {
      database.selectCount = selectResult.count;
    }

    const insertDelete = await maybeInsertDelete(
      runInsertDelete,
      table,
      searchColumn,
      randomString
    );
    database.insert = insertDelete.insert;
    database.delete = insertDelete.delete;

    const list = await maybeList(listCount, table, searchColumn);
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
