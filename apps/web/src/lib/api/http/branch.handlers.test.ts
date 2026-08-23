import { describe, expect, it, vi } from "vitest";
import { createBranchHandlers } from "./branch.handlers";

describe("REST branch handlers", () => {
  it("lists branches for the authenticated business", async () => {
    const session = vi.fn().mockResolvedValue({
      user: { id: "user-1" },
      business: { id: "business-1" },
    });
    const list = vi.fn().mockResolvedValue([{ id: "branch-1", name: "Main" }]);
    const handlers = createBranchHandlers({ session, list });

    const response = await handlers.list(
      new Request("https://pet-store.test/api/v1/branches", {
        headers: { Cookie: "session_token=token-1" },
      }),
      "branch-request"
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: [{ id: "branch-1", name: "Main" }],
    });
    expect(session).toHaveBeenCalledWith("token-1");
    expect(list).toHaveBeenCalledWith("business-1");
  });

  it("rejects requests without a valid session", async () => {
    const list = vi.fn();
    const handlers = createBranchHandlers({
      session: vi.fn().mockResolvedValue(null),
      list,
    });

    const response = await handlers.list(
      new Request("https://pet-store.test/api/v1/branches"),
      "branch-request"
    );

    expect(response.status).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });
});
