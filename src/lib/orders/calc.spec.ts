import { describe, expect, it } from "vitest";
import { discountAmount, subtotal, totalAmount } from "./calc";

describe("order calculations", () => {
  const EXPECTED_SUBTOTAL = 8;
  const COUPON_COUNT_POSITIVE = 3;
  const EXPECTED_DISCOUNT_POSITIVE = 6;
  const COUPON_COUNT_NEGATIVE = -2;
  const EXPECTED_DISCOUNT_NEGATIVE = 0;
  const COUPON_COUNT_LARGE = 10;
  const EXPECTED_TOTAL_ZERO = 0;

  const items = [{ price: 3 }, { price: 2, is_treat: true }, { price: 5 }];

  it("subtotal excludes treats", () => {
    expect(subtotal(items)).toBe(EXPECTED_SUBTOTAL);
  });

  it("discount is 2 per coupon and clamps at 0", () => {
    expect(discountAmount(COUPON_COUNT_POSITIVE)).toBe(
      EXPECTED_DISCOUNT_POSITIVE
    );
    expect(discountAmount(COUPON_COUNT_NEGATIVE)).toBe(
      EXPECTED_DISCOUNT_NEGATIVE
    );
  });

  it("total clamps at zero", () => {
    expect(totalAmount(items, COUPON_COUNT_LARGE)).toBe(EXPECTED_TOTAL_ZERO);
  });
});
