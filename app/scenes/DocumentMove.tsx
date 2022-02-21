import FuzzySearch from "fuzzy-search";
import { last } from "lodash";
import { observer } from "mobx-react";
import { useMemo, useState } from "react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import styled from "styled-components";
import { DocumentPath } from "~/stores/CollectionsStore";
import Document from "~/models/Document";
import Flex from "~/components/Flex";
import { Outline } from "~/components/Input";
import Labeled from "~/components/Labeled";
import PathToDocument from "~/components/PathToDocument";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

type Props = {
  document: Document;
  onRequestClose: () => void;
};

function DocumentMove({ document, onRequestClose }: Props) {
  const [searchTerm, setSearchTerm] = useState<string>();
  const { collections, documents } = useStores();
  const { showToast } = useToasts();
  const { t } = useTranslation();

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

  const results = useMemo(() => {
    const onlyShowCollections = document.isTemplate;
    let results: DocumentPath[] = [];

    if (collections.isLoaded) {
      if (searchTerm) {
        results = searchIndex.search(searchTerm);
      } else {
        results = searchIndex.haystack;
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
  }, [document, collections, searchTerm, searchIndex]);

  const handleSuccess = () => {
    showToast(t("Document moved"), {
      type: "info",
    });
    onRequestClose();
  };

  const handleFilter = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(ev.target.value);
  };

  const renderPathToCurrentDocument = () => {
    const result = collections.getPathForDocument(document.id);

    if (result) {
      return (
        <PathToDocument
          result={result}
          collection={collections.get(result.collectionId)}
        />
      );
    }

    return null;
  };

  const row = ({
    index,
    data,
    style,
  }: {
    index: number;
    data: DocumentPath[];
    style: React.CSSProperties;
  }) => {
    const result = data[index];
    return (
      <PathToDocument
        result={result}
        document={document}
        collection={collections.get(result.collectionId)}
        onSuccess={handleSuccess}
        style={style}
      />
    );
  };

  const data = results;

  if (!document || !collections.isLoaded) {
    return null;
  }

  return (
    <Flex column>
      <Section>
        <Labeled label={t("Current location")}>
          {renderPathToCurrentDocument()}
        </Labeled>
      </Section>

      <Section column>
        <Labeled label={t("Choose a new location")} />
        <NewLocation>
          <InputWrapper>
            <Input
              type="search"
              placeholder={`${t("Search collections & documents")}…`}
              onChange={handleFilter}
              required
              autoFocus
            />
          </InputWrapper>
          <Results>
            <AutoSizer>
              {({ width, height }: { width: number; height: number }) => (
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
        </NewLocation>
      </Section>
    </Flex>
  );
}

const InputWrapper = styled("div")`
  padding: 8px;
  width: 100%;
`;

const Input = styled("input")`
  width: 100%;
  outline: none;
  background: none;
  border-radius: 4px;
  height: 30px;
  border: 0;
  color: ${(props) => props.theme.text};

  &::placeholder {
    color: ${(props) => props.theme.placeholder};
  }
`;

const NewLocation = styled(Outline)`
  display: block;
  flex: initial;
  height: 40vh;
`;

const Results = styled.div`
  padding: 8px 0;
  height: calc(100% - 46px);
`;

const Section = styled(Flex)`
  margin-bottom: 24px;
`;

export default observer(DocumentMove);
