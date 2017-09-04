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
import { size, color } from 'styles/constants';

import Modal from 'components/Modal';
import Button from 'components/Button';
import Input from 'components/Input';
import HelpText from 'components/HelpText';
import Labeled from 'components/Labeled';
import Flex from 'components/Flex';
import ChevronIcon from 'components/Icon/ChevronIcon';

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
  store: DocumentMoveStore;
  firstDocument: HTMLElement;

  @observable isSaving: boolean;
  @observable resultIds: Array<string> = []; // Document IDs
  @observable searchTerm: ?string = null;
  @observable isFetching = false;

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

  handleFilter = (e: SyntheticEvent) => {
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
      this.resultIds = [];
    }

    this.isFetching = false;
  };

  render() {
    const { document, documents } = this.props;

    return (
      <Modal
        isOpen
        onRequestClose={this.handleClose}
        title={`Move ${document.title}`}
      >
        <HelpText />
        <Section>
          <Labeled label="Current location">
            <PathToDocument documentId={document.id} documents={documents} />
          </Labeled>
        </Section>

        <Section column>
          <Labeled label="New location">
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

        {false &&
          <Button
            type="submit"
            disabled={this.isSaving || !this.store.hasSelected}
          >
            {this.isSaving ? 'Moving…' : 'Move'}
          </Button>}
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

type PathToDocumentProps = {
  documentId: string,
  onSuccess?: Function,
  documents: DocumentsStore,
  document?: Document,
  ref?: Function,
  selectable?: boolean,
};

class PathToDocument extends React.Component {
  props: PathToDocumentProps;

  get resultDocument(): ?Document {
    return this.props.documents.getById(this.props.documentId);
  }

  handleSelect = async event => {
    const { document } = this.props;
    invariant(this.props.onSuccess, 'onSuccess unavailable');
    event.preventDefault();
    await document.move(this.resultDocument ? this.resultDocument.id : null);
    this.props.onSuccess();
  };

  render() {
    const { document, onSuccess, ref } = this.props;
    const { collection } = document || this.resultDocument;
    const Component = onSuccess ? ResultWrapperLink : ResultWrapper;

    return (
      <Component
        innerRef={ref}
        selectable
        href={!!onSuccess}
        onClick={onSuccess && this.handleSelect}
      >
        {collection.name}
        {this.resultDocument &&
          <Flex>
            {' '}
            <ChevronIcon />
            {' '}
            {this.resultDocument.pathToDocument
              .map(doc => <span>{doc.title}</span>)
              .reduce((prev, curr) => [prev, <ChevronIcon />, curr])}
          </Flex>}
        {document &&
          <Flex>
            {' '}
            <ChevronIcon />
            {' '}{document.title}
          </Flex>}
      </Component>
    );
  }
}

const ResultWrapper = styled.div`
  display: flex;
  margin-bottom: 10px;

  color: ${color.text};
  cursor: default;
`;

const ResultWrapperLink = ResultWrapper.withComponent('a').extend`
  padding-top: 3px;

  &:hover,
  &:active,
  &:focus {
    margin-left: -8px;
    padding-left: 6px;
    background: ${color.smokeLight};
    border-left: 2px solid ${color.primary};
    outline: none;
    cursor: pointer;
  }
`;

export default withRouter(inject('documents')(DocumentMove));
