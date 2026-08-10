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

type Grooming = {
  id: string;
  petName: string;
  price: number;
  status: "booked" | "in_progress" | "done" | "cancelled";
};

type Order = { id: string; total: number };

/** The appointment as it now stands. */
async function reread(id: string): Promise<Grooming | undefined> {
  const all = await post<Grooming[]>("grooming.list");
  return all.find((item) => item.id === id);
}

// The seed carries three appointments and there is no endpoint to book one,
// so each test claims a different one by name rather than taking whichever
// is unfinished — otherwise the first test to run leaves nothing for the
// next.
describe("what a grooming appointment will not do", () => {
  it("finishes once, and will not be taken back to charge again", async () => {
    // Finishing a groom raises a sale and awards loyalty points, guarded only
    // by the appointment not already being done. Nothing stopped it being
    // moved back to in_progress first, and finishing it again then charged
    // the customer a second time.
    const groom = (await reread("grm-2")) as Grooming;
    const before = await post<Order[]>("orders.list");

    await post("grooming.setStatus", { id: groom.id, status: "in_progress" });
    expect((await reread(groom.id))?.status).toBe("in_progress");

    await post("grooming.setStatus", { id: groom.id, status: "done" });
    expect((await reread(groom.id))?.status).toBe("done");

    await post("grooming.setStatus", { id: groom.id, status: "in_progress" });
    expect((await reread(groom.id))?.status).toBe("done");

    await post("grooming.setStatus", { id: groom.id, status: "done" });

    const after = await post<Order[]>("orders.list");
    const raised = after.filter(
      (order) =>
        !before.some((seen) => seen.id === order.id) &&
        order.total === groom.price
    );
    expect(raised).toHaveLength(1);
  });

  it("refuses a status it does not recognise", async () => {
    // The endpoint asserted the body's string into the status type rather
    // than checking it, so any word at all was written straight through.
    const groom = (await reread("grm-1")) as Grooming;
    const was = groom.status;

    await post("grooming.setStatus", { id: groom.id, status: "banana" });

    expect((await reread(groom.id))?.status).toBe(was);
  });

  it("will not reopen an appointment that is already finished", async () => {
    const groom = (await reread("grm-3")) as Grooming;
    expect(groom.status).toBe("done");

    await post("grooming.setStatus", { id: groom.id, status: "booked" });

    expect((await reread(groom.id))?.status).toBe("done");
  });
});
