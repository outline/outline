import * as React from "react";
import useIsMounted from "./useIsMounted";

type RequestResponse<T> = {
  /** The return value of the request function. */
  data: T | undefined;
  /** The request error, if any. */
  error: unknown;
  /** Whether the request is currently in progress. */
  loading: boolean;
  /** Whether the request has completed - useful to check if the request has completed at least once. */
  loaded: boolean;
  /** Function to start the request. */
  request: () => Promise<T | undefined>;
};

/**
 * A hook to make an API request and track its state within a component.
 *
 * @param requestFn The function to call to make the request, it should return a promise.
 * @param makeRequestOnMount Whether to make the request when the component mounts.
 * @returns An object containing the request state and a function to start the request.
 */
export default function useRequest<T = unknown>(
  requestFn: () => Promise<T>,
  makeRequestOnMount = false
): RequestResponse<T> {
  const isMounted = useIsMounted();
  const [data, setData] = React.useState<T>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [error, setError] = React.useState();

  const request = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await requestFn();

      if (isMounted()) {
        setData(response);
        setError(undefined);
        setLoaded(true);
      }
      return response;
    } catch (err) {
      if (isMounted()) {
        setError(err);
      }
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }

    return undefined;
  }, [requestFn, isMounted]);

  React.useEffect(() => {
    if (makeRequestOnMount) {
      void request();
    }
  }, []);

  return { data, loading, loaded, error, request };
}
