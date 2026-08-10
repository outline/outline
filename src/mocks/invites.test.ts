import { describe, expect, it } from "vitest";
import { handleShopRequest } from "./shop";

/** Posts to a mock endpoint the way the app's client does. */
async function post<T>(
  path: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const response = await handleShopRequest(path, body);
  return response?.data as T;
}

type Invite = {
  id: string;
  email: string;
  role: string;
  branch: string;
  status: "pending" | "accepted";
  sentAt: string;
};

/** An address nobody is using yet. */
const freshEmail = () => `invitee-${Math.random().toString(36).slice(2)}@acmepets.id`;

describe("inviting someone", () => {
  it("records an invitation nobody has taken up yet", async () => {
    const email = freshEmail();

    const result = await post<{ sent: boolean; invite: Invite }>(
      "staff.invite",
      { email, role: "caretaker", branch: "Kemang" }
    );

    expect(result.sent).toBe(true);
    expect(result.invite.status).toBe("pending");
  });

  it("does not put them on the staff list until they accept", async () => {
    const email = freshEmail();
    await post("staff.invite", { email, role: "cashier", branch: "Kemang" });

    const staff = await post<{ email: string }[]>("staff.list");
    expect(staff.some((member) => member.email === email)).toBe(false);
  });

  it("refuses an address that already works here", async () => {
    const staff = await post<{ email: string }[]>("staff.list");

    const result = await post<{ sent: boolean; reason?: string }>(
      "staff.invite",
      { email: staff[0].email, role: "cashier", branch: "Kemang" }
    );

    expect(result.sent).toBe(false);
    expect(result.reason).toBe("already_staff");
  });

  it("refuses inviting the same address twice", async () => {
    const email = freshEmail();
    await post("staff.invite", { email, role: "cashier", branch: "Kemang" });

    const again = await post<{ sent: boolean; reason?: string }>(
      "staff.invite",
      { email, role: "cashier", branch: "Kemang" }
    );

    expect(again.sent).toBe(false);
    expect(again.reason).toBe("already_invited");
  });

  it("refuses a role that does not exist", async () => {
    const result = await post<{ sent: boolean; reason?: string }>(
      "staff.invite",
      { email: freshEmail(), role: "wizard", branch: "Kemang" }
    );

    expect(result.sent).toBe(false);
    expect(result.reason).toBe("bad_role");
  });

  it("puts them on the staff list once accepted", async () => {
    const email = freshEmail();
    const sent = await post<{ invite: Invite }>("staff.invite", {
      email,
      role: "groomer",
      branch: "Bintaro",
      name: "Nadia Putri",
    });

    const result = await post<{ accepted: boolean }>("staff.acceptInvite", {
      id: sent.invite.id,
    });

    expect(result.accepted).toBe(true);
    const staff = await post<{ email: string; role: string; branch: string }[]>(
      "staff.list"
    );
    const joined = staff.find((member) => member.email === email);
    expect(joined?.role).toBe("groomer");
    expect(joined?.branch).toBe("Bintaro");
  });

  it("cannot be accepted twice", async () => {
    const email = freshEmail();
    const sent = await post<{ invite: Invite }>("staff.invite", {
      email,
      role: "caretaker",
      branch: "Kemang",
    });
    await post("staff.acceptInvite", { id: sent.invite.id });

    const again = await post<{ accepted: boolean; reason?: string }>(
      "staff.acceptInvite",
      { id: sent.invite.id }
    );

    expect(again.accepted).toBe(false);
    expect(again.reason).toBe("not_pending");
  });

  it("can be withdrawn before it is taken up", async () => {
    const email = freshEmail();
    const sent = await post<{ invite: Invite }>("staff.invite", {
      email,
      role: "caretaker",
      branch: "Kemang",
    });

    await post("staff.withdrawInvite", { id: sent.invite.id });

    const invites = await post<Invite[]>("staff.invites");
    expect(invites.some((invite) => invite.id === sent.invite.id)).toBe(false);
  });
});
