// @flow
import * as React from 'react';
import ReactDOM from 'react-dom';
import { observable, computed } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Search } from 'js-search';
import { last } from 'lodash';
import ArrowKeyNavigation from 'boundless-arrow-key-navigation';
import styled from 'styled-components';

import Modal from 'components/Modal';
import Input from 'components/Input';
import Labeled from 'components/Labeled';
import PathToDocument from 'components/PathToDocument';
import Flex from 'shared/components/Flex';

import Document from 'models/Document';
import DocumentsStore from 'stores/DocumentsStore';
import UiStore from 'stores/UiStore';
import CollectionsStore, { type DocumentPath } from 'stores/CollectionsStore';

const MAX_RESULTS = 8;

type Props = {|
  document: Document,
  documents: DocumentsStore,
  collections: CollectionsStore,
  ui: UiStore,
  onRequestClose: () => void,
|};

@observer
class DocumentMove extends React.Component<Props> {
  firstDocument: ?PathToDocument;
  @observable searchTerm: ?string;
  @observable isSaving: boolean;

  @computed
  get searchIndex() {
    const { collections } = this.props;
    const paths = collections.pathsToDocuments;
    const index = new Search('id');
    index.addIndex('title');

    // Build index
    const indexeableDocuments = [];
    paths.forEach(path => indexeableDocuments.push(path));
    index.addDocuments(indexeableDocuments);

    return index;
  }

  @computed
  get results(): DocumentPath[] {
    const { document, collections } = this.props;

    let results = [];
    if (collections.isLoaded) {
      if (this.searchTerm) {
        results = this.searchIndex.search(this.searchTerm);
      } else {
        results = this.searchIndex._documents;
      }
    }

    // Exclude root from search results if document is already at the root
    if (!document.parentDocumentId) {
      results = results.filter(result => result.id !== document.collectionId);
    }

    // Exclude document if on the path to result, or the same result
    results = results.filter(
      result =>
        !result.path.map(doc => doc.id).includes(document.id) &&
        last(result.path.map(doc => doc.id)) !== document.parentDocumentId
    );

    return results;
  }

  handleKeyDown = ev => {
    // Down
    if (ev.which === 40) {
      ev.preventDefault();
      if (this.firstDocument) {
        const element = ReactDOM.findDOMNode(this.firstDocument);
        if (element instanceof HTMLElement) element.focus();
      }
    }
  };

  handleSuccess = () => {
    this.props.ui.showToast('Document moved');
    this.props.onRequestClose();
  };

  handleFilter = (ev: SyntheticInputEvent<*>) => {
    this.searchTerm = ev.target.value;
  };

  setFirstDocumentRef = ref => {
    this.firstDocument = ref;
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

  render() {
    const { document, collections, onRequestClose } = this.props;

    return (
      <Modal isOpen onRequestClose={onRequestClose} title="Move document">
        {document &&
          collections.isLoaded && (
            <Flex column>
              <Section>
                <Labeled label="Current location">
                  {this.renderPathToCurrentDocument()}
                </Labeled>
              </Section>

              <Section column>
                <Labeled label="Choose a new location">
                  <Input
                    type="search"
                    placeholder="Search collections & documents…"
                    onKeyDown={this.handleKeyDown}
                    onChange={this.handleFilter}
                    required
                    autoFocus
                  />
                </Labeled>
                <Flex column>
                  <StyledArrowKeyNavigation
                    mode={ArrowKeyNavigation.mode.VERTICAL}
                    defaultActiveChildIndex={0}
                  >
                    {this.results
                      .slice(0, MAX_RESULTS)
                      .map((result, index) => (
                        <PathToDocument
                          key={result.id}
                          result={result}
                          document={document}
                          collection={collections.get(result.collectionId)}
                          ref={ref =>
                            index === 0 && this.setFirstDocumentRef(ref)
                          }
                          onSuccess={this.handleSuccess}
                        />
                      ))}
                  </StyledArrowKeyNavigation>
                </Flex>
              </Section>
            </Flex>
          )}
      </Modal>
    );
  }
}

const Section = styled(Flex)`
  margin-bottom: 24px;
`;

const StyledArrowKeyNavigation = styled(ArrowKeyNavigation)`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

export default inject('documents', 'collections', 'ui')(DocumentMove);
