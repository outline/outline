// @flow
import { Search } from "js-search";
import { last } from "lodash";
import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { type DocumentPath } from "stores/CollectionsStore";
import Document from "models/Document";
import PathToDocument from "components/PathToDocument";
import useStores from "hooks/useStores";

export default function useListDocumentPath(document: Document) {
  const { collections, documents, policies } = useStores();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedPath, setSelectedPath] = useState<?DocumentPath>();

  const searchIndex = useMemo(() => {
    let paths = collections.pathsToDocuments;

    paths = paths.filter((path) => {
      if (
        (path.type === "collection" && policies.abilities(path.id).update) ||
        (path.type === "document" &&
          policies.abilities(path.collectionId).update)
      )
        return true;

      return false;
    });

    const index = new Search("id");
    index.addIndex("title");

    // Build index
    const indexeableDocuments = [];
    paths.forEach((path) => {
      const doc = documents.get(path.id);
      if (!doc || !doc.isTemplate) {
        indexeableDocuments.push(path);
      }
    });
    index.addDocuments(indexeableDocuments);

    return index;
  }, [collections.pathsToDocuments, policies, documents]);

  const selected = useCallback(
    (result: DocumentPath) => {
      if (!selectedPath) return;

      if (selectedPath.type === "collection" && selectedPath.id === result.id) {
        return true;
      }
      if (
        selectedPath.type === "document" &&
        selectedPath.id === result.id &&
        selectedPath.collectionId === result.collectionId
      ) {
        return true;
      }
      return false;
    },
    [selectedPath]
  );

  const results: DocumentPath[] = useMemo(() => {
    const onlyShowCollections = document.isTemplate;
    let results = [];
    if (collections.isLoaded) {
      if (searchTerm) {
        results = searchIndex.search(searchTerm);
      } else {
        results = searchIndex._documents;
      }
    }

    if (onlyShowCollections) {
      results = results.filter((result) => result.type === "collection");
    } else {
      // Exclude root from search results if document is already at the root
      if (!document.parentDocumentId) {
        results = results.filter(
          (result) => result.id !== document.collectionId
        );
      }

      // Exclude document if on the path to result, or the same result
      results = results.filter(
        (result) =>
          !result.path.map((doc) => doc.id).includes(document.id) &&
          last(result.path.map((doc) => doc.id)) !== document.parentDocumentId
      );
    }

    return results;
  }, [
    document.isTemplate,
    document.parentDocumentId,
    document.collectionId,
    document.id,
    collections.isLoaded,
    searchTerm,
    searchIndex,
  ]);

  const row = React.useCallback(
    ({
      index,
      data,
      style,
    }: {
      index: number,
      data: Array<DocumentPath>,
      style: Object,
    }) => {
      const result = data[index];

      return (
        <PathToDocument
          key={result.url}
          result={result}
          document={document}
          collection={collections.get(result.collectionId)}
          setSelectedPath={setSelectedPath}
          style={style}
          selected={selected(result)}
        />
      );
    },
    [collections, document, selected]
  );

  return {
    row,
    results,
    searchTerm,
    setSearchTerm,
    selectedPath,
    setSelectedPath,
  };
}
