import type { ColumnSort } from "@tanstack/react-table";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { FetchPageParams, PaginatedResponse } from "~/stores/base/Store";
import { PAGINATION_SYMBOL } from "~/stores/base/Store";
import { useTableRequest } from "./useTableRequest";

interface Row {
  id: string;
  createdAt: number;
}

type ReqParams = Record<string, string>;

type HookResult = ReturnType<typeof useTableRequest<Row>>;

const sort: ColumnSort = { id: "createdAt", desc: true };

const page = (
  rows: Row[],
  offset: number,
  total: number
): PaginatedResponse<Row> => {
  const response: PaginatedResponse<Row> = [...rows];
  response[PAGINATION_SYMBOL] = { limit: 25, offset, total, nextPath: "" };
  return response;
};

const row = (id: string, createdAt: number): Row => ({ id, createdAt });

const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

describe("useTableRequest", () => {
  let result: HookResult;
  let root: ReturnType<typeof createRoot>;

  const Harness = ({
    reqFn,
    reqParams,
  }: {
    reqFn: (params: FetchPageParams) => Promise<PaginatedResponse<Row>>;
    reqParams: ReqParams;
  }) => {
    result = useTableRequest<Row>({ sort, reqFn, reqParams });
    return null;
  };

  beforeEach(() => {
    root = createRoot(document.createElement("div"));
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it("appends further pages to the rows returned by the server", async () => {
    const reqFn = vi.fn((params: FetchPageParams) =>
      Promise.resolve(
        params.offset === 0
          ? page([row("b", 2)], 0, 2)
          : page([row("a", 1)], 25, 2)
      )
    );
    const reqParams = {};

    act(() => root.render(<Harness reqFn={reqFn} reqParams={reqParams} />));
    await flush();

    expect(result.data?.map((item) => item.id)).toEqual(["b"]);
    expect(result.next).toBeDefined();

    act(() => result.next?.());
    await flush();

    expect(reqFn).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 25 })
    );
    expect(result.data?.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("does not offer another page once the total is reached", async () => {
    const reqFn = vi.fn(() => Promise.resolve(page([row("a", 1)], 0, 1)));
    const reqParams = {};

    act(() => root.render(<Harness reqFn={reqFn} reqParams={reqParams} />));
    await flush();

    expect(result.next).toBeUndefined();
  });

  it("does not offer another page without a total", async () => {
    const reqFn = vi.fn(() => {
      const response = page([row("a", 1)], 0, 1);
      response[PAGINATION_SYMBOL] = undefined;
      return Promise.resolve(response);
    });
    const reqParams = {};

    act(() => root.render(<Harness reqFn={reqFn} reqParams={reqParams} />));
    await flush();

    expect(result.next).toBeUndefined();
  });

  it("removes rows that overlap with a previous page", async () => {
    const reqFn = vi.fn((params: FetchPageParams) =>
      Promise.resolve(
        params.offset === 0
          ? page([row("b", 2)], 0, 3)
          : page([row("b", 2), row("a", 1)], 25, 3)
      )
    );
    const reqParams = {};

    act(() => root.render(<Harness reqFn={reqFn} reqParams={reqParams} />));
    await flush();
    act(() => result.next?.());
    await flush();

    expect(result.data?.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("replaces the rows when the params change", async () => {
    const reqFn = vi.fn((params: FetchPageParams) =>
      Promise.resolve(
        params.query
          ? page([row("match", 1)], 0, 1)
          : page([row("other", 2)], 0, 1)
      )
    );

    act(() => root.render(<Harness reqFn={reqFn} reqParams={{}} />));
    await flush();
    expect(result.data?.map((item) => item.id)).toEqual(["other"]);

    act(() =>
      root.render(<Harness reqFn={reqFn} reqParams={{ query: "match" }} />)
    );
    await flush();
    expect(result.data?.map((item) => item.id)).toEqual(["match"]);
  });

  it("ignores a stale response that arrives after the params change", async () => {
    let resolveStale: (value: PaginatedResponse<Row>) => void = () => undefined;
    const reqFn = vi.fn((params: FetchPageParams) =>
      params.query
        ? Promise.resolve(page([row("fresh", 1)], 0, 1))
        : new Promise<PaginatedResponse<Row>>((resolve) => {
            resolveStale = resolve;
          })
    );

    act(() => root.render(<Harness reqFn={reqFn} reqParams={{}} />));
    await flush();

    act(() =>
      root.render(<Harness reqFn={reqFn} reqParams={{ query: "fresh" }} />)
    );
    await flush();

    resolveStale(page([row("stale", 2)], 0, 1));
    await flush();

    expect(result.data?.map((item) => item.id)).toEqual(["fresh"]);
  });
});
