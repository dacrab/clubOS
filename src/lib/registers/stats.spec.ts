import { describe, expect, it } from "vitest";
import { discountsForSession, ordersTotalForSession } from "./stats";

describe("registers stats", () => {
  const EXPECTED_ORDERS_TOTAL_CLOSING = 42;
  const EXPECTED_ORDERS_TOTAL_SUM = 30;
  const EXPECTED_DISCOUNTS_CLOSING = 7;

  it("prefers closing orders_total", () => {
    const closing = {
      session_id: "s1",
      orders_total: EXPECTED_ORDERS_TOTAL_CLOSING,
    };
    const orders = [
      { id: "o1", created_at: "", total_amount: 10 },
      { id: "o2", created_at: "", total_amount: 20 },
    ];
    expect(ordersTotalForSession(closing, orders)).toBe(
      EXPECTED_ORDERS_TOTAL_CLOSING
    );
  });

  it("sums when closing value missing", () => {
    const closing = { session_id: "s1" };
    const orders = [
      { id: "o1", created_at: "", total_amount: 10 },
      { id: "o2", created_at: "", total_amount: 20 },
    ];
    expect(ordersTotalForSession(closing, orders)).toBe(
      EXPECTED_ORDERS_TOTAL_SUM
    );
  });

  it("prefers closing total_discounts", () => {
    const closing = {
      session_id: "s1",
      total_discounts: EXPECTED_DISCOUNTS_CLOSING,
    };
    const orders = [
      { id: "o1", created_at: "", discount_amount: 1 },
      { id: "o2", created_at: "", discount_amount: 2 },
    ];
    expect(discountsForSession(closing, orders)).toBe(
      EXPECTED_DISCOUNTS_CLOSING
    );
  });
});
