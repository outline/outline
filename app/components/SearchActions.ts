import { useKBar } from "kbar";
import * as React from "react";
import {
  navigateToRecentSearchQuery,
  navigateToSearchQuery,
} from "~/actions/definitions/navigation";
import useCommandBarActions from "~/hooks/useCommandBarActions";
import useStores from "~/hooks/useStores";

export default function SearchActions() {
  const { searches } = useStores();

  React.useEffect(() => {
    searches.fetchPage({});
  }, [searches]);

  const { searchQuery } = useKBar((state) => ({
    searchQuery: state.searchQuery,
  }));

  useCommandBarActions(searchQuery ? [navigateToSearchQuery(searchQuery)] : []);

  useCommandBarActions(searches.recent.map(navigateToRecentSearchQuery));

  return null;
}
