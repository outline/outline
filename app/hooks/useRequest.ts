import * as React from "react";

export default function useRequest<T = unknown>(
  requestFn: () => Promise<T>
): {
  data: T | undefined;
  error: any;
  loading: boolean;
  request: () => Promise<void>;
} {
  const [data, setData] = React.useState<T>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState();

  const request = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await requestFn();
      setData(response);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [requestFn]);

  return { data, loading, error, request };
}
