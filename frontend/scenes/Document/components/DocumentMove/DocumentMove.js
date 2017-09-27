// @flow
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { observable, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router';
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

type Props = {
  match: Object,
  history: Object,
  document: Document,
  documents: DocumentsStore,
};

@observer class DocumentMove extends Component {
  props: Props;
  firstDocument: HTMLElement;

  @observable isSaving: boolean;
  @observable resultIds: Array<string> = []; // Document IDs
  @observable searchTerm: ?string = null;
  @observable isFetching = false;

  componentDidMount() {
    this.setDefaultResult();
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

  handleFilter = (ev: SyntheticInputEvent) => {
    this.searchTerm = ev.target.value;
    this.updateSearchResults();
  };

  updateSearchResults = _.debounce(() => {
    this.search();
  }, 250);

  setFirstDocumentRef = ref => {
    this.firstDocument = ref;
  };

  @action setDefaultResult() {
    this.resultIds = this.props.document.collection.documents.map(
      doc => doc.id
    );
  }

  @action search = async () => {
    this.isFetching = true;

    if (this.searchTerm) {
      try {
        this.resultIds = await this.props.documents.search(this.searchTerm);
      } catch (e) {
        console.error('Something went wrong');
      }
    } else {
      this.setDefaultResult();
    }

    this.isFetching = false;
  };

  render() {
    const { document, documents } = this.props;
    let resultSet;

    resultSet = this.resultIds.filter(docId => {
      const resultDoc = documents.getById(docId);

      if (document && resultDoc) {
        return (
          // Exclude the document if it's on the path to a potential new path
          !resultDoc.pathToDocument.map(doc => doc.id).includes(document.id) &&
          // Exclude if the same path, e.g the last one before the current
          _.last(resultDoc.pathToDocument).id !== document.parentDocumentId
        );
      }
      return true;
    });

    // Prepend root if document does have a parent document
    resultSet = document.parentDocumentId
      ? _.concat(null, resultSet)
      : this.resultIds;

    return (
      <Modal isOpen onRequestClose={this.handleClose} title="Move document">
        <Section>
          <Labeled label="Current location">
            <PathToDocument documentId={document.id} documents={documents} />
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
              {resultSet.map((documentId, index) => (
                <PathToDocument
                  key={documentId || document.id}
                  documentId={documentId}
                  documents={documents}
                  document={document}
                  ref={ref => index === 0 && this.setFirstDocumentRef(ref)}
                  onSuccess={this.handleClose}
                />
              ))}
            </StyledArrowKeyNavigation>
          </Flex>
        </Section>
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

export default withRouter(inject('documents')(DocumentMove));
