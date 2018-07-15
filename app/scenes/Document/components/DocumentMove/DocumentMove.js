// @flow
import * as React from 'react';
import ReactDOM from 'react-dom';
import { observable, computed } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Search } from 'js-search';
import ArrowKeyNavigation from 'boundless-arrow-key-navigation';
import _ from 'lodash';
import styled from 'styled-components';

import Modal from 'components/Modal';
import Input from 'components/Input';
import Labeled from 'components/Labeled';
import Flex from 'shared/components/Flex';
import PathToDocument from './components/PathToDocument';

import Document from 'models/Document';
import DocumentsStore from 'stores/DocumentsStore';
import CollectionsStore, { type DocumentPath } from 'stores/CollectionsStore';

type Props = {
  match: Object,
  history: Object,
  document: Document,
  documents: DocumentsStore,
  collections: CollectionsStore,
};

@observer
class DocumentMove extends React.Component<Props> {
  firstDocument: *;
  @observable searchTerm: ?string;
  @observable isSaving: boolean;

  @computed
  get searchIndex() {
    const { document, collections } = this.props;
    const paths = collections.pathsToDocuments;
    const index = new Search('id');
    index.addIndex('title');

    // Build index
    const indexeableDocuments = [];
    paths.forEach(path => {
      // TMP: For now, exclude paths to other collections
      if (_.first(path.path).id !== document.collection.id) return;

      indexeableDocuments.push(path);
    });
    index.addDocuments(indexeableDocuments);

    return index;
  }

  @computed
  get results(): DocumentPath[] {
    const { document, collections } = this.props;

    let results = [];
    if (collections.isLoaded) {
      if (this.searchTerm) {
        // Search by the keyword
        results = this.searchIndex.search(this.searchTerm);
      } else {
        // Default results, root of the current collection
        results = [];
        document.collection.documents.forEach(doc => {
          const path = collections.getPathForDocument(doc.id);
          if (doc && path) {
            results.push(path);
          }
        });
      }
    }

    if (document && document.parentDocumentId) {
      // Add root if document does have a parent document
      const rootPath = collections.getPathForDocument(document.collection.id);
      if (rootPath) {
        results = [rootPath, ...results];
      }
    }

    // Exclude root from search results if document is already at the root
    if (!document.parentDocumentId) {
      results = results.filter(result => result.id !== document.collection.id);
    }

    // Exclude document if on the path to result, or the same result
    results = results.filter(
      result =>
        !result.path.map(doc => doc.id).includes(document.id) &&
        _.last(result.path.map(doc => doc.id)) !== document.parentDocumentId
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

  handleClose = () => {
    this.props.history.push(this.props.document.url);
  };

  handleFilter = (e: SyntheticInputEvent<*>) => {
    this.searchTerm = e.target.value;
  };

  setFirstDocumentRef = ref => {
    this.firstDocument = ref;
  };

  renderPathToCurrentDocument() {
    const { collections, document } = this.props;
    const result = collections.getPathForDocument(document.id);
    if (result) {
      return <PathToDocument result={result} />;
    }
  }

  render() {
    const { document, collections } = this.props;

    return (
      <Modal isOpen onRequestClose={this.handleClose} title="Move document">
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
                    type="text"
                    placeholder="Filter by document name…"
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
                    {this.results.map((result, index) => (
                      <PathToDocument
                        key={result.id}
                        result={result}
                        document={document}
                        ref={ref =>
                          index === 0 && this.setFirstDocumentRef(ref)
                        }
                        onSuccess={this.handleClose}
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

export default withRouter(inject('documents', 'collections')(DocumentMove));
