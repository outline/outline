import sortBy from "lodash/sortBy";
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
  reqFn,
  reqParams,
}: Props<T>): Response<T> {
  const [dataIds, setDataIds] = React.useState<string[]>();
  const [total, setTotal] = React.useState<number>();
  const [offset, setOffset] = React.useState({ value: INITIAL_OFFSET });
  const prevParamsRef = React.useRef(reqParams);

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

      const ids = response.map((item) => item.id);

      if (offset.value === INITIAL_OFFSET) {
        setDataIds(response.map((item) => item.id));
      } else {
        setDataIds((prev) => (prev ?? []).concat(ids));
      }

      setTotal(response[PAGINATION_SYMBOL]?.total);
    };

    void handleRequest();

    return () => {
      ignore = true;
    };
  }, [reqParams, offset, request]);

  const filteredData = dataIds
    ? sortBy(
        data.filter((item) => dataIds.includes(item.id)),
        (item) => dataIds.indexOf(item.id)
      )
    : undefined;

  const next =
    !loading && dataIds && total && dataIds.length < total
      ? nextPage
      : undefined;

  return {
    data: filteredData,
    error,
    loading,
    next,
  };
}
