import { useCallback } from "react";
import { useHistory } from "react-router-dom";
import { patchLocation } from "~/utils/history";

/**
 * Hook to remove the search highlight term from the current url.
 *
 * @returns a callback that clears the search highlight query param.
 */
export function useClearSearchHighlight() {
  const history = useHistory();

  return useCallback(() => {
    const location = history.location;
    const params = new URLSearchParams(location.search);
    if (!params.has("q")) {
      return;
    }

    params.delete("q");
    const search = params.toString();
    history.replace(
      patchLocation(location, { search: search ? `?${search}` : "" })
    );
  }, [history]);
}
