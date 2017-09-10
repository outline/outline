// @flow
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { observable, runInAction, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router';
import ArrowKeyNavigation from 'boundless-arrow-key-navigation';
import _ from 'lodash';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
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
        // $FlowFixMe
        if (element && element.focus) element.focus();
      }
    }
  };

  handleClose = () => {
    this.props.history.push(this.props.document.url);
  };

  handleFilter = (e: SyntheticInputEvent) => {
    const value = e.target.value;
    this.searchTerm = value;
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
        const res = await client.get('/documents.search', {
          query: this.searchTerm,
        });
        invariant(res && res.data, 'res or res.data missing');
        const { data } = res;
        runInAction('search document', () => {
          // Fill documents store
          data.forEach(documentData =>
            this.props.documents.add(new Document(documentData))
          );
          this.resultIds = data.map(documentData => documentData.id);
        });
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
              <PathToDocument
                document={document}
                documents={documents}
                ref={ref => this.setFirstDocumentRef(ref)}
                onSuccess={this.handleClose}
              />
              {this.resultIds.map((documentId, index) => (
                <PathToDocument
                  key={documentId}
                  documentId={documentId}
                  documents={documents}
                  document={document}
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
