// @flow
import { Search } from "js-search";
import { last } from "lodash";
import * as React from "react";
import { useTranslation } from "react-i18next";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import { Dialog, DialogBackdrop, type DialogStateReturn } from "reakit";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { type DocumentPath } from "stores/CollectionsStore";
import Document from "models/Document";
import Button from "components/Button";
import Divider from "components/Divider";
import Flex from "components/Flex";
import InputSearch from "components/InputSearch";
import PathToDocument from "components/PathToDocument";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";

type Props = {|
  dialog: DialogStateReturn,
  document: Document,
  onSave: ({
    done?: boolean,
    publish?: boolean,
    autosave?: boolean,
  }) => void,
|};

const PublishDialog = ({ dialog, document, onSave }: Props) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = React.useState();
  const [selectedPath, setSelectedPath] = React.useState<?DocumentPath>();
  const { collections, documents, policies } = useStores();
  const { showToast } = useToasts();

  React.useEffect(() => {
    if (!dialog.visible) {
      setSelectedPath(undefined);
    }
  }, [dialog.visible]);

  const handleChange = React.useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  const handleKeyDown = React.useCallback((event) => {
    if (event.currentTarget.value && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setSearchTerm("");
    }
  }, []);

  const handlePublishFromModal = React.useCallback(
    async (selectedPath) => {
      if (!document) return;
      if (!selectedPath) {
        showToast(t("Please select a path"));
        return;
      }

      if (selectedPath.type === "collection") {
        await onSave({
          done: true,
          publish: true,
          collectionId: selectedPath.collectionId,
        });
      } else {
        await onSave({
          done: true,
          publish: true,
          collectionId: selectedPath.collectionId,
          parentDocumentId: selectedPath.id,
        });
      }
      dialog.setVisible(false);
    },
    [dialog, document, onSave, showToast, t]
  );

  const selected = React.useCallback(
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

  const searchIndex = React.useMemo(() => {
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

  const results: DocumentPath[] = React.useMemo(() => {
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
  }, [document, collections, searchTerm, searchIndex]);

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
    <Wrapper>
      <DialogBackdrop {...dialog}>
        <Dialog
          {...dialog}
          aria-label="Choose a collection"
          preventBodyScroll
          hideOnEsc
        >
          <Position>
            <Content>
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
                  {({ width, height }) => {
                    return (
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
                    );
                  }}
                </AutoSizer>
              </Results>
              <Divider />
              <ButtonWrapper justify="flex-end">
                <Button
                  disabled={!selectedPath}
                  onClick={() => handlePublishFromModal(selectedPath)}
                >
                  Publish
                </Button>
              </ButtonWrapper>
            </Content>
          </Position>
        </Dialog>
      </DialogBackdrop>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  position: relative;
`;

const Position = styled.div`
  position: absolute;
  z-index: ${(props) => props.theme.depths.menu};
  right: 8vh;
  top: 4vh;

  ${breakpoint("mobile", "tablet")`
    position: fixed !important;
    transform: none !important;
    top: auto !important;
    right: 8px !important;
    bottom: 16px !important;
    left: 8px !important;
  `};
`;

const Results = styled.div`
  padding: 8px 0;
  height: calc(93% - 52px);
`;

const Content = styled.div`
  background: ${(props) => props.theme.background};
  width: 70vw;
  max-width: 600px;
  height: 40vh;
  max-height: 500px;
  border-radius: 8px;
  padding: 10px;
  box-shadow: ${(props) => props.theme.menuShadow};

  ${breakpoint("mobile", "tablet")`
    right: -2vh;
    width: 90vw;
`};
`;

const ButtonWrapper = styled(Flex)`
  margin: 10px 0;
`;

export default PublishDialog;
