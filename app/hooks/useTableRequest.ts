import type { ColumnSort } from "@tanstack/react-table";
import { orderBy, uniqBy } from "es-toolkit/compat";
import { useState, useRef, useCallback, useEffect } from "react";
import type { FetchPageParams, PaginatedResponse } from "~/stores/base/Store";
import { PAGINATION_SYMBOL } from "~/stores/base/Store";
import useRequest from "./useRequest";

const INITIAL_OFFSET = 0;
const PAGE_SIZE = 25;

type Props<T> = {
  /**
   * The rows to display, usually derived from a store. When omitted the rows
   * returned by the server for the current params are displayed, which is
   * required when the server filtering can't be reproduced on the client.
   */
  data?: T[];
  sort: ColumnSort;
  reqFn: (params: FetchPageParams) => Promise<PaginatedResponse<T>>;
  reqParams: Omit<FetchPageParams, "offset" | "limit">;
};

type Response<T> = {
  data: T[] | undefined;
  error: unknown;
  loading: boolean;
  next: (() => void) | undefined;
};

export function useTableRequest<T extends { id: string }>({
  data,
  sort,
  reqFn,
  reqParams,
}: Props<T>): Response<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [offset, setOffset] = useState({ value: INITIAL_OFFSET });
  const prevParamsRef = useRef(reqParams);
  const sortRef = useRef<ColumnSort>(sort);

  const fetchPage = useCallback(
    () => reqFn({ ...reqParams, offset: offset.value, limit: PAGE_SIZE }),
    [reqFn, reqParams, offset]
  );

  const { request, loading, error } = useRequest(fetchPage);

  const nextPage = useCallback(
    () =>
      setOffset((prev) => ({
        value: prev.value + PAGE_SIZE,
      })),
    []
  );

  const sortedData = orderBy(
    data ?? rows,
    sortRef.current.id,
    sortRef.current.desc ? "desc" : "asc"
  );

  const next = !loading && hasNext ? nextPage : undefined;

  useEffect(() => {
    if (prevParamsRef.current !== reqParams) {
      prevParamsRef.current = reqParams;
      setHasNext(false);
      setOffset({ value: INITIAL_OFFSET });
      return;
    }

    let ignore = false;

    const handleRequest = async () => {
      const response = await request();
      if (!response || ignore) {
        return;
      }

      sortRef.current = sort; // Change sort once we receive a response from server - avoids flicker with stale data.
      setRows((prev) =>
        offset.value === INITIAL_OFFSET
          ? response
          : uniqBy([...prev, ...response], "id")
      );
      const pagination = response[PAGINATION_SYMBOL];
      setHasNext(
        !!pagination && pagination.offset + response.length < pagination.total
      );
    };

    void handleRequest();

    return () => {
      ignore = true;
    };
  }, [sort, reqParams, offset, request]);

  return {
    data: sortedData,
    error,
    loading,
    next,
  };
}
