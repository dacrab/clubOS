import { describe, it, expect, vi } from "vitest";
import { generateRandomString, defaultRandomStringLength, pingEndpoint } from "./keep-alive-helper";

describe("generateRandomString", () => {
	it("returns lowercase alphabetic string with default length", () => {
		const value = generateRandomString();
		expect(value).toHaveLength(defaultRandomStringLength);
		expect(value).toMatch(/^[a-z]+$/);
	});

	it("respects custom length and produces different values", () => {
		const first = generateRandomString(20);
		const second = generateRandomString(20);
		expect(first).toHaveLength(20);
		expect(second).toHaveLength(20);
		// Very small chance of collision but acceptable for a unit test
		expect(first).not.toBe(second);
	});
});

describe("pingEndpoint", () => {
	const url = "https://example.com/health";

	it("returns ok result when fetch succeeds", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue({ ok: true, status: 204 } as Response);

		const result = await pingEndpoint(url);

		expect(fetchMock).toHaveBeenCalledWith(
			url,
			expect.objectContaining({
				method: "GET",
				headers: expect.objectContaining({
					"Cache-Control": expect.stringContaining("no-cache"),
					Pragma: "no-cache",
				}),
			})
		);
		expect(result).toEqual({ url, ok: true, status: 204 });
	});

	it("captures errors when fetch rejects", async () => {
		const error = new Error("Network failure");
		vi.spyOn(globalThis, "fetch").mockRejectedValue(error);

		const result = await pingEndpoint(url);

		expect(result.ok).toBe(false);
		expect(result.status).toBe(0);
		expect(result.error).toBe("Network failure");
	});

	it("handles non-Error rejections gracefully", async () => {
		vi.spyOn(globalThis, "fetch").mockRejectedValue("string error" as unknown);

		const result = await pingEndpoint(url);

		expect(result.ok).toBe(false);
		expect(result.status).toBe(0);
		expect(result.error).toBe("Unknown error");
	});
});
