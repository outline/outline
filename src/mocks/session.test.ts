import { beforeEach, describe, expect, it } from "vitest";
import { currentRole, handleShopRequest, hasSession } from "./shop";

/** Posts to a mock endpoint the way the app's client does. */
async function post<T>(
  path: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const response = await handleShopRequest(path, body);
  return response?.data as T;
}

describe("signing in", () => {
  beforeEach(async () => {
    await post("auth.delete");
  });

  it("has no role while signed out", () => {
    expect(hasSession()).toBe(false);
    expect(currentRole()).toBeUndefined();
  });

  it("signs the business owner in as the owner", async () => {
    const business = await post<{ ownerEmail: string }>("business.info");
    const result = await post<{ ok: boolean; role?: string }>("auth.signIn", {
      email: business.ownerEmail,
      password: "longenough12",
    });

    expect(result.ok).toBe(true);
    expect(result.role).toBe("owner");
    expect(currentRole()).toBe("owner");
  });

  it("signs a staff member in as their own role", async () => {
    const staff = await post<{ email: string; role: string }[]>("staff.list");
    const cashier = staff.find((member) => member.role === "cashier");

    const result = await post<{ ok: boolean; role?: string }>("auth.signIn", {
      email: cashier?.email,
      password: "longenough12",
    });

    expect(result.ok).toBe(true);
    expect(result.role).toBe("cashier");
    expect(currentRole()).toBe("cashier");
  });

  it("gives every staff member an address to sign in with", async () => {
    const staff = await post<{ email: string }[]>("staff.list");

    staff.forEach((member) => {
      expect(member.email).toMatch(/^[^@\s]+@[^@\s]+$/);
    });
  });

  it("refuses a member who is no longer active", async () => {
    const staff =
      await post<{ id: string; email: string; role: string }[]>("staff.list");
    const member = staff.find((item) => item.role === "groomer");
    await post("staff.setStatus", { id: member?.id, status: "inactive" });

    const result = await post<{ ok: boolean; reason?: string }>("auth.signIn", {
      email: member?.email,
      password: "longenough12",
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("inactive");
    expect(hasSession()).toBe(false);

    await post("staff.setStatus", { id: member?.id, status: "active" });
  });

  it("refuses an address nobody works under", async () => {
    const result = await post<{ ok: boolean; reason?: string }>("auth.signIn", {
      email: "nobody@example.com",
      password: "longenough12",
    });

    expect(result.ok).toBe(false);
    expect(currentRole()).toBeUndefined();
  });

  it("forgets the role on the way out", async () => {
    const business = await post<{ ownerEmail: string }>("business.info");
    await post("auth.signIn", {
      email: business.ownerEmail,
      password: "longenough12",
    });
    expect(currentRole()).toBe("owner");

    await post("auth.delete");

    expect(currentRole()).toBeUndefined();
    expect(hasSession()).toBe(false);
  });
});
