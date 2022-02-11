import FuzzySearch from "fuzzy-search";
import { useMemo, useState } from "react";
import { DocumentPath } from "~/stores/CollectionsStore";
import useStores from "~/hooks/useStores";

type FilterFunction = (searchResults: DocumentPath[]) => DocumentPath[];

export default function useSearchDocumentPath(
  postFilterResults: FilterFunction = (result) => result
) {
  const [searchTerm, setSearchTerm] = useState<string>();
  const { collections, documents } = useStores();

  const searchIndex = useMemo(() => {
    const paths = collections.pathsToDocuments;

    // Build index
    const indexeableDocuments: DocumentPath[] = [];

    paths.forEach((path) => {
      const doc = documents.get(path.id);

      if (!doc || !doc.isTemplate) {
        indexeableDocuments.push(path);
      }
    });

    return new FuzzySearch<DocumentPath>(indexeableDocuments, ["title"], {
      caseSensitive: false,
      sort: true,
    });
  }, [documents, collections.pathsToDocuments]);

  const searchResults = useMemo(() => {
    let results: DocumentPath[] = [];

    if (collections.isLoaded) {
      if (searchTerm) {
        results = searchIndex.search(searchTerm);
      } else {
        results = searchIndex.haystack;
      }
    }

    results = postFilterResults(results);

    return results;
  }, [postFilterResults, collections, searchTerm, searchIndex]);

  return { searchTerm, setSearchTerm, searchResult: searchResults };
}
