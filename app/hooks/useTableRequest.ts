import { ColumnSort } from "@tanstack/react-table";
import orderBy from "lodash/orderBy";
import React from "react";
import {
  FetchPageParams,
  PaginatedResponse,
  PAGINATION_SYMBOL,
} from "~/stores/base/Store";
import useRequest from "./useRequest";

const INITIAL_OFFSET = 0;
const PAGE_SIZE = 25;

type Props<T> = {
  data: T[];
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
  const [total, setTotal] = React.useState<number>();
  const [offset, setOffset] = React.useState({ value: INITIAL_OFFSET });
  const prevParamsRef = React.useRef(reqParams);
  const sortRef = React.useRef<ColumnSort>(sort);

  const fetchPage = React.useCallback(
    () => reqFn({ ...reqParams, offset: offset.value, limit: PAGE_SIZE }),
    [reqFn, reqParams, offset]
  );

  const { request, loading, error } = useRequest(fetchPage);

  const nextPage = React.useCallback(
    () =>
      setOffset((prev) => ({
        value: prev.value + PAGE_SIZE,
      })),
    []
  );

  const sortedData = data
    ? orderBy(data, sortRef.current.id, sortRef.current.desc ? "desc" : "asc")
    : undefined;

  const next =
    !loading && total && sortedData && sortedData.length < total
      ? nextPage
      : undefined;

  React.useEffect(() => {
    if (prevParamsRef.current !== reqParams) {
      prevParamsRef.current = reqParams;
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
      setTotal(response[PAGINATION_SYMBOL]?.total);
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
