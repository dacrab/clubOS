import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { supabaseAdmin } from "$lib/server/supabaseAdmin";
import { KEEP_ALIVE_CONFIG } from "$lib/config/keep-alive-config";
import { generateRandomString, pingEndpoint } from "$lib/server/keep-alive-helper";

export const GET: RequestHandler = async () => {
  const { table, searchColumn, runInsertDelete, listCount, otherEndpoints } = KEEP_ALIVE_CONFIG;

  const randomString = generateRandomString();

  const database: {
    selectCount?: number;
    insert?: "success" | "skipped" | "failed";
    delete?: "success" | "skipped" | "failed";
    list?: unknown[];
    error?: string;
  } = {};

  try {
    // 1) Simple read to keep DB active
    const selectResponse = await supabaseAdmin
      .from(table)
      .select(searchColumn)
      .eq(searchColumn, randomString)
      .limit(1);

    if (selectResponse.error) {
      database.error = selectResponse.error.message;
    } else {
      database.selectCount = Array.isArray(selectResponse.data) ? selectResponse.data.length : 0;
    }

    // 2) Optional insert/delete to exercise writes
    if (runInsertDelete) {
      const insertResponse = await supabaseAdmin
        .from(table)
        .insert({ [searchColumn]: randomString });

      database.insert = insertResponse.error ? "failed" : "success";

      const deleteResponse = await supabaseAdmin
        .from(table)
        .delete()
        .eq(searchColumn, randomString);

      database.delete = deleteResponse.error ? "failed" : "success";
    } else {
      database.insert = "skipped";
      database.delete = "skipped";
    }

    // 3) Optional list of recent entries
    if (listCount > 0) {
      const listResponse = await supabaseAdmin
        .from(table)
        .select(searchColumn)
        .limit(listCount);
      if (!listResponse.error) database.list = listResponse.data as unknown[];
    }
  } catch (error) {
    database.error = error instanceof Error ? error.message : "Unknown database error";
  }

  // 4) Ping other endpoints in parallel
  const endpointResults = await Promise.all(otherEndpoints.map((url) => pingEndpoint(url)));

  const body = {
    message: "Keep-alive executed",
    database,
    otherEndpoints: endpointResults
  };

  return json(body, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache"
    }
  });
};


