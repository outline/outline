import { describe, expect, it } from "vitest";
import { mockDb } from "./db";
import { handleShopRequest } from "./shop";

/** Posts to a mock endpoint the way the app's client does. */
async function post<T>(
  path: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const response = await handleShopRequest(path, body);
  return response?.data as T;
}

type ApiKey = {
  id: string;
  name: string;
  value: string;
  last4: string;
  scope?: string[];
  expiresAt?: string | null;
  lastActiveAt?: string | null;
  userId: string;
};

describe("api keys", () => {
  it("answers the endpoints Outline's own settings page calls", async () => {
    expect(await post("apiKeys.list")).toBeDefined();

    const created = await post<ApiKey>("apiKeys.create", {
      name: "Deploy script",
    });
    expect(created.id).toBeDefined();

    const list = await post<ApiKey[]>("apiKeys.list");
    expect(list.some((item) => item.id === created.id)).toBe(true);

    await post("apiKeys.delete", { id: created.id });
    const after = await post<ApiKey[]>("apiKeys.list");
    expect(after.some((item) => item.id === created.id)).toBe(false);
  });

  it("issues a secret that looks like one", async () => {
    const created = await post<ApiKey>("apiKeys.create", { name: "Secret" });

    expect(created.value).toMatch(/^ol_api_/);
    expect(created.value.length).toBeGreaterThan(20);
  });

  it("records the last four so a key can be told apart later", async () => {
    const created = await post<ApiKey>("apiKeys.create", { name: "Last four" });

    expect(created.last4).toBe(created.value.slice(-4));
  });

  it("gives each key a secret of its own", async () => {
    const keys = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        post<ApiKey>("apiKeys.create", { name: `Key ${index}` })
      )
    );

    const secrets = keys.map((key) => key.value);
    expect(new Set(secrets).size).toBe(secrets.length);
  });

  it("belongs to the signed-in user, who the page filters by", async () => {
    // The settings page shows only keys whose userId matches the signed-in
    // user; a key attributed to anyone else is invisible.
    const created = await post<ApiKey>("apiKeys.create", { name: "Mine" });

    expect(created.userId).toBe(mockDb.getState().user.id);
  });

  it("leaves the scope unset when nothing was restricted", async () => {
    // The settings page renders "Restricted scope" for any scope it is given,
    // and an empty array is truthy, so an unrestricted key must have none.
    const created = await post<ApiKey>("apiKeys.create", { name: "Wide open" });

    expect(created.scope).toBeUndefined();
  });

  it("keeps the scopes it was given", async () => {
    const created = await post<ApiKey>("apiKeys.create", {
      name: "Narrow",
      scope: ["documents.info"],
    });

    expect(created.scope).toEqual(["documents.info"]);
  });

  it("refuses a key with no name", async () => {
    const before = await post<ApiKey[]>("apiKeys.list");

    await post("apiKeys.create", { name: "  " });

    const after = await post<ApiKey[]>("apiKeys.list");
    expect(after).toHaveLength(before.length);
  });

  it("keeps the expiry it was given", async () => {
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();

    const created = await post<ApiKey>("apiKeys.create", {
      name: "Expiring",
      expiresAt,
    });

    expect(created.expiresAt).toBe(expiresAt);
  });

  it("answers the connected applications list too", async () => {
    // The same page renders OAuth authentications beside the keys.
    expect(await post("oauthAuthentications.list")).toBeDefined();
  });
});
