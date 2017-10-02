// @flow
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { observable, computed, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router';
import { Search } from 'js-search';
import ArrowKeyNavigation from 'boundless-arrow-key-navigation';
import _ from 'lodash';
import styled from 'styled-components';
import { size } from 'styles/constants';

import Modal from 'components/Modal';
import Input from 'components/Input';
import Labeled from 'components/Labeled';
import Flex from 'components/Flex';
import PathToDocument from './components/PathToDocument';

import Document from 'models/Document';
import DocumentsStore from 'stores/DocumentsStore';
import CollectionsStore from 'stores/CollectionsStore';

type Props = {
  match: Object,
  history: Object,
  document: Document,
  documents: DocumentsStore,
  collections: CollectionsStore,
};

type DocumentResult = {
  id: string,
  title: string,
  type: 'document' | 'collection', 
}

type SearchResult = DocumentResult & {
  path: Array<DocumentResult>,
}

@observer class DocumentMove extends Component {
  props: Props;
  firstDocument: HTMLElement;

  @observable searchTerm: ?string;
  @observable isSaving: boolean;

  @computed
  get searchIndex() {
    const { document, collections } = this.props;
    const paths = collections.pathsToDocuments;
    const index = new Search('id');
    index.addIndex('title');

    // Build index
    paths.forEach(path => {
      // TMP: For now, exclude paths to other collections
      if (_.first(path).id !== document.collection.id) return;

      const tail = _.last(path);
      index.addDocuments([{
        ...tail,
        path: path,
      }]);
    });

    return index;
  }

  @computed get results(): Array<SearchResult> {
    const { document, collections } = this.props;

    let results = [];
    if (collections.isLoaded) {
      if (this.searchTerm) {
        // Search by 
        results = this.searchIndex.search(this.searchTerm);
      } else {
        // Default results, root of the current collection
        results = document.collection.documents.map(
          doc => collections.getPathForDocument(doc.id)
        );
      }
    }

    if (document.parentDocumentId) {
      // Add root if document does have a parent document
      results = [
        collections.getPathForDocument(document.collection.id),
        ...results,
      ]
    } else {
      // Exclude root from search results if document is already at the root
      results = results.filter(result => 
        result.id !== document.collection.id);
    }

    // Exclude document if on the path to result, or the same result
    results = results.filter(result => {
      return !result.path.map(doc => doc.id).includes(document.parentDocumentId);
    });

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

  handleFilter = (e: SyntheticInputEvent) => {
    this.searchTerm = e.target.value;
  };

  setFirstDocumentRef = ref => {
    this.firstDocument = ref;
  };

  render() {
    const { document, documents, collections } = this.props;

    return (
      <Modal isOpen onRequestClose={this.handleClose} title="Move document">
        {collections.isLoaded ? (
          <Flex column>
            <Section>
              <Labeled label="Current location">
                <PathToDocument result={collections.getPathForDocument(document.id)} />
              </Labeled>
            </Section>

            <Section column>
              <Labeled label="Choose a new location">
                <Input
                  type="text"
                  placeholder="Filter by document name"
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
                      ref={ref => index === 0 && this.setFirstDocumentRef(ref)}
                      onClick={ () => 'move here' }
                    />
                  ))}
                </StyledArrowKeyNavigation>
              </Flex>
            </Section>
          </Flex>
        ) : <div>loading</div>}
      </Modal>
    );
  }
}

const Section = styled(Flex)`
  margin-bottom: ${size.huge};
`;

const StyledArrowKeyNavigation = styled(ArrowKeyNavigation)`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

export default withRouter(inject('documents', 'collections')(DocumentMove));
