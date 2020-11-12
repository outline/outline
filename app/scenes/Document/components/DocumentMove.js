// @flow
import { Search } from "js-search";
import { last } from "lodash";
import { observable, computed } from "mobx";
import { observer, inject } from "mobx-react";
import * as React from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import styled from "styled-components";
import CollectionsStore, { type DocumentPath } from "stores/CollectionsStore";
import DocumentsStore from "stores/DocumentsStore";
import UiStore from "stores/UiStore";
import Document from "models/Document";
import Flex from "components/Flex";
import { Outline } from "components/Input";
import Labeled from "components/Labeled";
import Modal from "components/Modal";
import PathToDocument from "components/PathToDocument";

type Props = {|
  document: Document,
  documents: DocumentsStore,
  collections: CollectionsStore,
  ui: UiStore,
  onRequestClose: () => void,
|};

@observer
class DocumentMove extends React.Component<Props> {
  @observable searchTerm: ?string;
  @observable isSaving: boolean;

  @computed
  get searchIndex() {
    const { collections, documents } = this.props;
    const paths = collections.pathsToDocuments;
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
  }

  @computed
  get results(): DocumentPath[] {
    const { document, collections } = this.props;
    const onlyShowCollections = document.isTemplate;

    let results = [];
    if (collections.isLoaded) {
      if (this.searchTerm) {
        results = this.searchIndex.search(this.searchTerm);
      } else {
        results = this.searchIndex._documents;
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
  }

  handleSuccess = () => {
    this.props.ui.showToast("Document moved");
    this.props.onRequestClose();
  };

  handleFilter = (ev: SyntheticInputEvent<*>) => {
    this.searchTerm = ev.target.value;
  };

  renderPathToCurrentDocument() {
    const { collections, document } = this.props;
    const result = collections.getPathForDocument(document.id);

    if (result) {
      return (
        <PathToDocument
          result={result}
          collection={collections.get(result.collectionId)}
        />
      );
    }
  }

  row = ({ index, data, style }) => {
    const result = data[index];
    const { document, collections } = this.props;

    return (
      <PathToDocument
        result={result}
        document={document}
        collection={collections.get(result.collectionId)}
        onSuccess={this.handleSuccess}
        style={style}
      />
    );
  };

  render() {
    const { document, collections, onRequestClose } = this.props;
    const data = this.results;

    return (
      <Modal isOpen onRequestClose={onRequestClose} title="Move document">
        {document && collections.isLoaded && (
          <Flex column>
            <Section>
              <Labeled label="Current location">
                {this.renderPathToCurrentDocument()}
              </Labeled>
            </Section>

            <Section column>
              <Labeled label="Choose a new location" />
              <NewLocation>
                <InputWrapper>
                  <Input
                    type="search"
                    placeholder="Search collections & documents…"
                    onChange={this.handleFilter}
                    required
                    autoFocus
                  />
                </InputWrapper>
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
                          {this.row}
                        </List>
                      </Flex>
                    )}
                  </AutoSizer>
                </Results>
              </NewLocation>
            </Section>
          </Flex>
        )}
      </Modal>
    );
  }
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

export default inject("documents", "collections", "ui")(DocumentMove);
