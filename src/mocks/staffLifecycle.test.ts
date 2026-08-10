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

type Staff = {
  id: string;
  name: string;
  status: "active" | "on_leave" | "inactive";
};

/** The member as they now stand. */
async function reread(id: string): Promise<Staff | undefined> {
  const all = await post<Staff[]>("staff.list");
  return all.find((member) => member.id === id);
}

describe("what a staff record will not do", () => {
  it("refuses a status it does not recognise", async () => {
    // The endpoint asserted the body's string into the status type rather
    // than checking it, so any word at all was written straight through —
    // and sign-in reads this field to decide who may in.
    const member = (await reread("stf-1")) as Staff;
    const was = member.status;

    await post("staff.setStatus", { id: member.id, status: "banana" });

    expect((await reread(member.id))?.status).toBe(was);
  });

  it("still moves somebody on and off leave", async () => {
    const member = (await reread("stf-4")) as Staff;

    await post("staff.setStatus", { id: member.id, status: "on_leave" });
    expect((await reread(member.id))?.status).toBe("on_leave");

    await post("staff.setStatus", { id: member.id, status: "active" });
    expect((await reread(member.id))?.status).toBe("active");
  });

  it("will not bring back somebody who has left", async () => {
    const member = (await reread("stf-5")) as Staff;
    await post("staff.setStatus", { id: member.id, status: "inactive" });

    await post("staff.setStatus", { id: member.id, status: "active" });

    expect((await reread(member.id))?.status).toBe("inactive");
  });
});
