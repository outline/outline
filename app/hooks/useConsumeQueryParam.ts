import { useEffect, useRef } from "react";
import { useHistory } from "react-router-dom";
import useQuery from "./useQuery";

/**
 * Hook that reads a query parameter from the URL and removes it after the first
 * render. Returns the value that was present when the component mounted, or
 * null if the parameter was absent.
 *
 * @param name - the query parameter name to consume.
 * @returns the consumed value, or null.
 */
export default function useConsumeQueryParam(name: string): string | null {
  const query = useQuery();
  const history = useHistory();
  const value = query.get(name);
  const consumedRef = useRef(false);

  useEffect(() => {
    if (value && !consumedRef.current) {
      consumedRef.current = true;

      const params = new URLSearchParams(window.location.search);
      params.delete(name);
      const search = params.toString();
      history.replace({
        pathname: window.location.pathname,
        search: search ? `?${search}` : "",
      });
    }
  }, [value, name, history]);

  return consumedRef.current ? null : value;
}
