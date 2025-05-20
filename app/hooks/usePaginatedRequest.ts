import uniqBy from "lodash/uniqBy";
import { useState, useEffect, useCallback } from "react";
import { PaginationParams } from "~/types";
import useRequest from "./useRequest";

type RequestResponse<T> = {
  /** The return value of the paginated request function. */
  data: T[] | undefined;
  /** The request error, if any. */
  error: unknown;
  /** Whether the request is currently in progress. */
  loading: boolean;
  /** Function to trigger next page request. */
  next: () => void;
  /** Page number */
  page: number;
  /** Offset */
  offset: number;
  /** Marks the end of pagination */
  end: boolean;
};

const INITIAL_OFFSET = 0;
const DEFAULT_LIMIT = 10;

/**
 * A hook to make paginated API request and track its state within a component.
 *
 * @param requestFn The function to call to make the request, it should return a promise.
 * @param params Pagination params(limit, offset etc) to be passed to requestFn.
 * @returns
 */
export default function usePaginatedRequest<T = unknown>(
  requestFn: (params?: PaginationParams | undefined) => Promise<T[]>,
  params: PaginationParams = {}
): RequestResponse<T> {
  const [data, setData] = useState<T[]>();
  const [offset, setOffset] = useState(INITIAL_OFFSET);
  const [page, setPage] = useState(0);
  const [end, setEnd] = useState(false);
  const displayLimit = params.limit || DEFAULT_LIMIT;
  const fetchLimit = displayLimit + 1;
  const [paginatedReq, setPaginatedReq] = useState(
    () => () =>
      requestFn({
        ...params,
        offset: 0,
        limit: fetchLimit,
      })
  );

  const {
    data: response,
    error,
    loading,
    request,
  } = useRequest<T[]>(paginatedReq);

  useEffect(() => {
    void request();
  }, [request]);

  useEffect(() => {
    if (response && !loading) {
      setData((prev) =>
        uniqBy((prev ?? []).concat(response.slice(0, displayLimit)), "id")
      );
      setPage((prev) => prev + 1);
      setEnd(response.length <= displayLimit);
    }
  }, [response, displayLimit, loading]);

  useEffect(() => {
    if (offset) {
      setPaginatedReq(
        () => () =>
          requestFn({
            ...params,
            offset,
            limit: fetchLimit,
          })
      );
    }
  }, [offset, fetchLimit, requestFn]);

  const next = useCallback(() => {
    setOffset((prev) => prev + displayLimit);
  }, [displayLimit]);

  useEffect(() => {
    setEnd(false);
    setData(undefined);
    setPage(0);
    setOffset(0);
  }, [requestFn]);

  return { data, next, loading, error, page, offset, end };
}
