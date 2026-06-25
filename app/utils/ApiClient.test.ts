import type { client as ClientType } from "./ApiClient";

// The app test setup globally mocks ApiClient; load the real module here.
const { client } = await vi.importActual<{ client: typeof ClientType }>(
  "./ApiClient"
);

/**
 * Runs `fn` with `client.fetch` replaced by `mock`, restoring it afterwards.
 * `fetch` is an instance arrow-function property, so it is swapped directly
 * rather than via `vi.spyOn`, whose restore would delete the property.
 */
async function withFetch(
  mock: typeof client.fetch,
  fn: () => void | Promise<void>
) {
  const original = client.fetch;
  client.fetch = mock;
  try {
    await fn();
  } finally {
    client.fetch = original;
  }
}

describe("ApiClient#batch", () => {
  it("coalesces batchable posts into a single /batch request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      data: [
        { ok: true, status: 200, data: { id: "1" }, policies: [] },
        { ok: false, status: 400, message: "nope" },
      ],
    });

    await withFetch(fetchMock, async () => {
      const results = await Promise.allSettled(
        client.batch(() => [
          client.post("/documents.archive", { id: "1" }),
          client.post("/documents.archive", { id: "2" }),
        ])
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith("/batch", "POST", {
        requests: [
          { method: "documents.archive", body: { id: "1" } },
          { method: "documents.archive", body: { id: "2" } },
        ],
      });

      expect(results[0]).toEqual({
        status: "fulfilled",
        value: { data: { id: "1" }, policies: [] },
      });
      expect(results[1].status).toBe("rejected");
    });
  });

  it("does not batch non-batchable posts", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ data: [] });

    await withFetch(fetchMock, () => {
      client.batch(() => {
        void client.post("/documents.list", { foo: 1 });
      });

      // documents.list is not batchable, so it is dispatched immediately and
      // never collected into a /batch request.
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        "/documents.list",
        "POST",
        { foo: 1 },
        undefined
      );
    });
  });

  it("rejects every collected request when the batch dispatch fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));

    await withFetch(fetchMock, async () => {
      const results = await Promise.allSettled(
        client.batch(() => [
          client.post("/documents.archive", { id: "1" }),
          client.post("/documents.delete", { id: "2" }),
        ])
      );

      expect(results[0].status).toBe("rejected");
      expect(results[1].status).toBe("rejected");
    });
  });
});
