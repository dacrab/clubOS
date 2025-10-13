import { describe, expect, it } from "vitest";
import { collectWithDescendants } from "./tree";

describe("categories tree", () => {
  const cats = [
    { id: "a", parent_id: null },
    { id: "b", parent_id: "a" },
    { id: "c", parent_id: "a" },
    { id: "d", parent_id: "b" },
  ];

  it("collects root and descendants", () => {
    const set = collectWithDescendants(cats, "a");
    expect([...set].sort()).toEqual(["a", "b", "c", "d"].sort());
  });
});
