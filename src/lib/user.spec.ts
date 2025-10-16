import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadCurrentUser, currentUser } from "$lib/user";

const supabaseMock = vi.hoisted(() => ({
  auth: { getSession: vi.fn() },
  from: vi.fn(),
}));

vi.mock("$lib/supabase-client", () => ({ supabase: supabaseMock }));

function setStoreNull() {
  currentUser.set(null);
}

describe("loadCurrentUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setStoreNull();
  });
  afterEach(() => {
    setStoreNull();
  });

  it("sets null when no session", async () => {
    supabaseMock.auth.getSession.mockResolvedValueOnce({ data: { session: null } });
    await loadCurrentUser();
    let value: unknown = undefined;
    currentUser.subscribe((v) => (value = v))();
    expect(value).toBeNull();
  });

  it("populates from auth metadata and falls back to DB", async () => {
    const userId = "user-1";
    supabaseMock.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: userId,
            email: "u@example.com",
            user_metadata: { role: "staff", username: "Meta Name" },
          },
        },
      },
    });
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: userId, role: "admin", username: "DB Name" } }),
            }),
          }),
        } as never;
      }
      if (table === "tenant_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ tenant_id: "t1" }, { tenant_id: "t2" }] }),
          }),
        } as never;
      }
      return {} as never;
    });

    await loadCurrentUser();
    let value: any;
    currentUser.subscribe((v) => (value = v))();
    expect(value).toEqual({
      id: userId,
      email: "u@example.com",
      role: "admin",
      username: "DB Name",
      tenantIds: ["t1", "t2"],
    });
  });
});


