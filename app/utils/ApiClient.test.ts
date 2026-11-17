import { client } from "./ApiClient";

vi.unmock("~/utils/ApiClient");

describe("ApiClient.batch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should send a lone request to its own endpoint", async () => {
    const fetch = vi
      .spyOn(client, "fetch")
      .mockResolvedValue({ data: { id: "1" } });

    const [result] = await Promise.all(
      client.batch(() => [client.post("/stars.create", { documentId: "a" })])
    );

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "/stars.create",
      "POST",
      { documentId: "a" },
      undefined
    );
    expect(result).toEqual({ data: { id: "1" } });
  });

  it("should send multiple requests in a single batch", async () => {
    const fetch = vi.spyOn(client, "fetch").mockResolvedValue({
      data: [
        { ok: true, status: 200, data: { id: "1" } },
        { ok: true, status: 200, data: { id: "2" } },
      ],
    });

    const results = await Promise.all(
      client.batch(() => [
        client.post("/stars.create", { documentId: "a" }),
        client.post("/stars.create", { documentId: "b" }),
      ])
    );

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toEqual("/batch");
    expect(results).toEqual([
      { data: { id: "1" }, policies: undefined },
      { data: { id: "2" }, policies: undefined },
    ]);
  });

  it("should reject a lone request when it fails", async () => {
    vi.spyOn(client, "fetch").mockRejectedValue(new Error("Failed"));

    const [result] = await Promise.allSettled(
      client.batch(() => [client.post("/stars.create", { documentId: "a" })])
    );

    expect(result.status).toEqual("rejected");
  });
});
