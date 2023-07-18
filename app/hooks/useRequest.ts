import * as React from "react";

type RequestResponse<T> = {
  /** The return value of the request function. */
  data: T | undefined;
  /** The request error, if any. */
  error: unknown;
  /** Whether the request is currently in progress. */
  loading: boolean;
  /** Function to start the request. */
  request: () => Promise<T | undefined>;
  /** Cleanup function, to be invoked upon unmount */
  cleanup: () => void;
};

/**
 * A hook to make an API request and track its state within a component.
 *
 * @param requestFn The function to call to make the request, it should return a promise.
 * @returns
 */
export default function useRequest<T = unknown>(
  requestFn: () => Promise<T>
): RequestResponse<T> {
  const [data, setData] = React.useState<T>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState();

  const request = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await requestFn();
      setData(response);
      return response;
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }

    return undefined;
  }, [requestFn]);

  const cleanup = React.useCallback(() => {
    if ((data || error) && !loading) {
      setData(undefined);
      setLoading(false);
      setError(undefined);
    }
  }, [data, loading, error]);

  return { data, loading, error, request, cleanup };
}
