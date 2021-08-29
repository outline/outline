// @flow
import { Search } from "js-search";
import { last } from "lodash";
import { useMemo, useState, useCallback } from "react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import styled from "styled-components";
import { type DocumentPath } from "stores/CollectionsStore";
import Document from "models/Document";
import Button from "components/Button";
import Flex from "components/Flex";
import InputSearch from "components/InputSearch";
import PathToDocument from "components/PathToDocument";
import useStores from "hooks/useStores";

type Props = {|
  document: Document,
  handleSelect: (?DocumentPath) => Promise<void>,
  selectName: string,
|};

const DocumentPathList = ({ document, handleSelect, selectName }: Props) => {
  const [searchTerm, setSearchTerm] = useState();
  const { collections, documents, policies } = useStores();
  const [selectedPath, setSelectedPath] = useState<?DocumentPath>();
  const { t } = useTranslation();

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

  const handleChange = (ev: SyntheticInputEvent<*>) => {
    setSearchTerm(ev.target.value);
  };

  const handleKeyDown = React.useCallback((event) => {
    if (event.currentTarget.value && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setSearchTerm("");
    }
  }, []);

  const selected = useCallback(
    (result) => {
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

  const row = ({ index, data, style }) => {
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
  };

  const data = results;

  return (
    <>
      <Flex align="center">
        <InputSearch
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          value={searchTerm}
          placeholder={`${t("Search collections & documents")}…`}
          flex
        />
      </Flex>
      <Results>
        <AutoSizer>
          {({ width, height }) => (
            <Flex role="listbox" column>
              <List
                key={data.length}
                width={width}
                height={height}
                itemData={data}
                itemCount={data.length}
                itemSize={40}
                itemKey={(index, data) => data[index].id}
              >
                {row}
              </List>
            </Flex>
          )}
        </AutoSizer>
      </Results>
      <ButtonWrapper justify="flex-end">
        <Button
          disabled={!selectedPath}
          onClick={() => handleSelect(selectedPath)}
        >
          {selectName}
        </Button>
      </ButtonWrapper>
    </>
  );
};

const Results = styled.div`
  padding: 8px 0;
  height: calc(100% - 80px);
`;

const ButtonWrapper = styled(Flex)`
  margin: 10px 0;
`;

export default DocumentPathList;
