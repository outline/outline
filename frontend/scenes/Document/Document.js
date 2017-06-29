// @flow
import React, { Component } from 'react';
import get from 'lodash/get';
import styled from 'styled-components';
import { observer, inject } from 'mobx-react';
import { withRouter, Prompt } from 'react-router';
import { Flex } from 'reflexbox';

import UiStore from 'stores/UiStore';
import DocumentsStore from 'stores/DocumentsStore';
import Menu from './components/Menu';
import Editor from 'components/Editor';
import { HeaderAction, SaveAction } from 'components/Layout';
import PublishingInfo from 'components/PublishingInfo';
import DocumentViews from 'components/DocumentViews';
import PreviewLoading from 'components/PreviewLoading';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';

const DISCARD_CHANGES = `
You have unsaved changes.
Are you sure you want to discard them?
`;

type Props = {
  match: Object,
  history: Object,
  keydown: Object,
  documents: DocumentsStore,
  newChildDocument?: boolean,
  ui: UiStore,
};

@observer class Document extends Component {
  props: Props;

  componentDidMount() {
    this.loadDocument(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.match.params.id !== this.props.match.params.id) {
      this.loadDocument(nextProps);
    }
  }

  componentWillUnmount() {
    this.props.ui.clearActiveDocument();
  }

  loadDocument = async props => {
    await this.props.documents.fetch(props.match.params.id);
    if (this.document) this.document.view();

    if (this.props.match.params.edit) {
      this.props.ui.enableEditMode();
    } else {
      this.props.ui.disableEditMode();
    }
  };

  get document() {
    return this.props.documents.getByUrl(`/d/${this.props.match.params.id}`);
  }

  onClickEdit = () => {
    if (!this.document) return;
    const url = `${this.document.url}/edit`;
    this.props.history.push(url);
    this.props.ui.enableEditMode();
  };

  onSave = async (redirect: boolean = false) => {
    if (!this.document) return;
    await this.document.save();
    this.props.ui.disableEditMode();

    if (redirect && this.document) {
      this.props.history.push(this.document.url);
    }
  };

  onImageUploadStart() {
    // TODO: How to set loading bar on layout?
  }

  onImageUploadStop() {
    // TODO: How to set loading bar on layout?
  }

  onChange = text => {
    if (!this.document) return;
    this.document.updateData({ text });
  };

  onCancel = () => {
    this.props.history.goBack();
  };

  render() {
    const isNew = this.props.newDocument || this.props.newChildDocument;
    const isEditing = this.props.match.params.edit;
    const isFetching = !this.document && get(this.document, 'isFetching');
    const titleText = get(this.document, 'title', 'Loading');

    return (
      <Container column auto>
        {titleText && <PageTitle title={titleText} />}
        {isFetching &&
          <CenteredContent>
            <PreviewLoading />
          </CenteredContent>}
        {!isFetching &&
          this.document &&
          <PagePadding justify="center" auto>
            <Prompt
              when={this.document.hasPendingChanges}
              message={DISCARD_CHANGES}
            />
            <DocumentContainer>
              <Editor
                key={this.document.id}
                text={this.document.text}
                onImageUploadStart={this.onImageUploadStart}
                onImageUploadStop={this.onImageUploadStop}
                onChange={this.onChange}
                onSave={this.onSave}
                onCancel={this.onCancel}
                onStar={this.document.star}
                onUnstar={this.document.unstar}
                starred={this.document.starred}
                readOnly={!isEditing}
              />
            </DocumentContainer>
            <Meta align="center" readOnly={!isEditing}>
              {!isEditing &&
                <PublishingInfo
                  collaborators={this.document.collaborators}
                  createdAt={this.document.createdAt}
                  createdBy={this.document.createdBy}
                  updatedAt={this.document.updatedAt}
                  updatedBy={this.document.updatedBy}
                />}
              {!isEditing &&
                <DocumentViews
                  count={this.document.views}
                  documentId={this.document.id}
                />}
              <Flex align="center">
                <HeaderAction>
                  {isEditing
                    ? <SaveAction
                        onClick={this.onSave.bind(this, true)}
                        disabled={get(this.document, 'isSaving')}
                        isNew={!!isNew}
                      />
                    : <a onClick={this.onClickEdit}>Edit</a>}
                </HeaderAction>
                {!isEditing && <Menu document={this.document} />}
              </Flex>
            </Meta>
          </PagePadding>}
      </Container>
    );
  }
}

const Meta = styled(Flex)`
  justify-content: ${props => (props.readOnly ? 'space-between' : 'flex-end')};
  align-items: flex-start;
  width: 100%;
  position: absolute;
  top: 0;
  padding: 10px 20px;
`;

const Container = styled(Flex)`
  position: relative;
  width: 100%;
`;

const PagePadding = styled(Flex)`
  padding: 80px 20px;
  position: relative;
`;

const DocumentContainer = styled.div`
  font-weight: 400;
  font-size: 1em;
  line-height: 1.5em;
  padding: 0 3em;
  width: 50em;
`;

export default withRouter(inject('ui', 'documents')(Document));
