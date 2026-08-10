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

type Boarding = {
  id: string;
  petName: string;
  status: "booked" | "checked_in" | "checked_out" | "cancelled";
};

// Each stay gets its own window: the room would otherwise be full for the
// dates a previous test booked, and the booking would be refused.
let window = 500;

/** Books a stay far enough ahead that it cannot clash with the seed. */
async function bookAStay(): Promise<Boarding> {
  window += 10;
  const rooms = await post<{ id: string }[]>("rooms.list");
  const before = await post<Boarding[]>("boardings.list");
  const from = (days: number) =>
    new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

  await post("boardings.create", {
    customerName: "Lifecycle Test",
    petName: "Rue",
    roomId: rooms[0].id,
    checkIn: from(window),
    checkOut: from(window + 2),
  });
  const after = await post<Boarding[]>("boardings.list");
  const booked = after.find(
    (stay) => !before.some((seen) => seen.id === stay.id)
  );
  if (!booked) {
    throw new Error("the stay was not booked");
  }
  return booked;
}

/** The stay as it now stands. */
async function reread(id: string): Promise<Boarding | undefined> {
  const all = await post<Boarding[]>("boardings.list");
  return all.find((stay) => stay.id === id);
}

describe("what a stay will not do", () => {
  it("refuses to check a guest back in once they have left", async () => {
    // Occupancy counts the rooms whose stay is checked_in. Moving a finished
    // stay back would put a guest in a room nobody has booked.
    const stay = await bookAStay();
    await post("boardings.updateStatus", { id: stay.id, status: "checked_in" });
    await post("boardings.updateStatus", {
      id: stay.id,
      status: "checked_out",
    });

    await post("boardings.updateStatus", { id: stay.id, status: "checked_in" });

    expect((await reread(stay.id))?.status).toBe("checked_out");
  });

  it("refuses a status it does not recognise", async () => {
    // The endpoint asserted the body's string into the status type rather
    // than checking it, so any word at all was written straight through.
    const stay = await bookAStay();

    await post("boardings.updateStatus", { id: stay.id, status: "banana" });

    expect((await reread(stay.id))?.status).toBe("booked");
  });

  it("still walks a stay through arrival and departure", async () => {
    const stay = await bookAStay();

    await post("boardings.updateStatus", { id: stay.id, status: "checked_in" });
    expect((await reread(stay.id))?.status).toBe("checked_in");

    await post("boardings.updateStatus", {
      id: stay.id,
      status: "checked_out",
    });
    expect((await reread(stay.id))?.status).toBe("checked_out");
  });

  it("lets a booking be cancelled before the guest arrives", async () => {
    const stay = await bookAStay();

    await post("boardings.updateStatus", { id: stay.id, status: "cancelled" });

    expect((await reread(stay.id))?.status).toBe("cancelled");
  });
});
