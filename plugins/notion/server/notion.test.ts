import { APIErrorCode, APIResponseError } from "@notionhq/client";
import { Headers } from "node-fetch";
import { NotionClient } from "./notion";

const rateLimitError = (headers: Record<string, string> = {}) =>
  new APIResponseError({
    code: APIErrorCode.RateLimited,
    status: 429,
    message: "You have been rate limited. Please try again later.",
    headers: new Headers(headers),
    rawBodyText: "",
  });

const emptySearch = {
  object: "list" as const,
  type: "page_or_database" as const,
  page_or_database: {},
  results: [],
  has_more: false,
  next_cursor: null,
};

describe("NotionClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should wait for the Retry-After header before retrying", async () => {
    const notion = new NotionClient("token");
    const search = vi
      .spyOn(notion["client"], "search")
      .mockRejectedValueOnce(rateLimitError({ "Retry-After": "5" }))
      .mockResolvedValue(emptySearch);

    const promise = notion.fetchRootPages();

    await vi.advanceTimersByTimeAsync(4900);
    expect(search).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(500);
    expect(search).toHaveBeenCalledTimes(2);
    await expect(promise).resolves.toEqual([]);
  });

  it("should pause other requests from the same client", async () => {
    const notion = new NotionClient("token");
    const search = vi
      .spyOn(notion["client"], "search")
      .mockRejectedValueOnce(rateLimitError({ "Retry-After": "5" }))
      .mockResolvedValue(emptySearch);

    const first = notion.fetchRootPages();
    await vi.advanceTimersByTimeAsync(100);
    const second = notion.fetchRootPages();

    await vi.advanceTimersByTimeAsync(4800);
    expect(search).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(search).toHaveBeenCalledTimes(3);
    await expect(Promise.all([first, second])).resolves.toEqual([[], []]);
  });

  it("should throw after the maximum number of rate limit retries", async () => {
    const notion = new NotionClient("token");
    const search = vi
      .spyOn(notion["client"], "search")
      .mockRejectedValue(rateLimitError());

    const promise = notion.fetchRootPages();
    const assertion = expect(promise).rejects.toBeInstanceOf(APIResponseError);

    await vi.runAllTimersAsync();
    await assertion;
    expect(search).toHaveBeenCalledTimes(9);
  });
});
