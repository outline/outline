import { useKBar } from "kbar";
import * as React from "react";
import { searchDocumentsForQuery } from "~/actions/definitions/documents";
import { navigateToRecentSearchQuery } from "~/actions/definitions/navigation";

import useCommandBarActions from "~/hooks/useCommandBarActions";
import useStores from "~/hooks/useStores";

export default function SearchActions() {
  const { searches } = useStores();

  React.useEffect(() => {
    if (!searches.isLoaded && !searches.isFetching) {
      void searches.fetchPage({
        source: "app",
      });
    }
  }, [searches]);

  const { searchQuery } = useKBar((state) => ({
    searchQuery: state.searchQuery,
  }));

  useCommandBarActions(
    searchQuery ? [searchDocumentsForQuery(searchQuery)] : [],
    [searchQuery]
  );

  useCommandBarActions(searches.recent.map(navigateToRecentSearchQuery));

  return null;
}
