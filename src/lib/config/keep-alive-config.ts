export type KeepAliveConfig = {
  table: string;
  searchColumn: string;
  runInsertDelete: boolean;
  listCount: number;
  otherEndpoints: string[];
};

export const KEEP_ALIVE_CONFIG: KeepAliveConfig = {
  table: "keep-alive",
  searchColumn: "name",
  // When true: insert a random row and delete it to exercise writes
  runInsertDelete: false,
  // Number of rows to list in the response (0 to skip)
  listCount: 0,
  // Add any other project endpoints to ping (must call their DB)
  otherEndpoints: []
};


