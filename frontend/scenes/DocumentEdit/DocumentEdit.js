// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { browserHistory, withRouter } from 'react-router';
import keydown from 'react-keydown';
import { Flex } from 'reflexbox';

import DocumentEditStore, { DOCUMENT_EDIT_SETTINGS } from './DocumentEditStore';
import EditorLoader from './components/EditorLoader';

import Layout, { Title, HeaderAction, SaveAction } from 'components/Layout';

import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';
import DropdownMenu, { MenuItem, MoreIcon } from 'components/DropdownMenu';

const DISREGARD_CHANGES = `You have unsaved changes.
Are you sure you want to disgard them?`;

type Props = {
  route: Object,
  router: Object,
  params: Object,
  keydown: Object,
};

@keydown([
  'cmd+enter',
  'ctrl+enter',
  'cmd+esc',
  'ctrl+esc',
  'cmd+shift+p',
  'ctrl+shift+p',
])
@withRouter
@observer
class DocumentEdit extends Component {
  store: DocumentEditStore;
  props: Props;

  constructor(props: Props) {
    super(props);
    this.store = new DocumentEditStore(
      JSON.parse(localStorage[DOCUMENT_EDIT_SETTINGS] || '{}')
    );
  }

  state = {
    scrollTop: 0,
  };

  componentDidMount = () => {
    if (this.props.route.newDocument) {
      this.store.collectionId = this.props.params.id;
      this.store.newDocument = true;
    } else if (this.props.route.newChildDocument) {
      this.store.documentId = this.props.params.id;
      this.store.newChildDocument = true;
      this.store.fetchDocument();
    } else {
      this.store.documentId = this.props.params.id;
      this.store.newDocument = false;
      this.store.fetchDocument();
    }

    // Load editor async
    EditorLoader().then(({ Editor }) => {
      // $FlowIssue we can remove after moving to new editor
      this.setState({ Editor });
    });

    // Set onLeave hook
    this.props.router.setRouteLeaveHook(this.props.route, () => {
      if (this.store.hasPendingChanges) {
        return confirm(DISREGARD_CHANGES);
      }
      return null;
    });
  };

  componentWillReceiveProps = (nextProps: Props) => {
    const key = nextProps.keydown.event;

    if (key) {
      // Cmd + Enter
      if (key.key === 'Enter' && (key.metaKey || key.ctrl.Key)) {
        this.onSave();
      }

      // Cmd + Esc
      if (key.key === 'Escape' && (key.metaKey || key.ctrl.Key)) {
        this.onCancel();
      }

      // Cmd + m
      if (key.key === 'P' && key.shiftKey && (key.metaKey || key.ctrl.Key)) {
        this.store.togglePreview();
      }
    }
  };

  onSave = () => {
    // if (this.props.title.length === 0) {
    //   alert("Please add a title before saving (hint: Write a markdown header)");
    //   return
    // }
    if (this.store.newDocument || this.store.newChildDocument) {
      this.store.saveDocument();
    } else {
      this.store.updateDocument();
    }
  };

  onCancel = () => {
    browserHistory.goBack();
  };

  onScroll = (scrollTop: number) => {
    this.setState({
      scrollTop,
    });
  };

  render() {
    const title = (
      <Title
        truncate={60}
        placeholder={!this.store.isFetching ? 'Untitled document' : null}
        content={this.store.title}
      />
    );

    const titleText = this.store.title;
    const isNew =
      this.props.route.newDocument || this.props.route.newChildDocument;

    const actions = (
      <Flex>
        <HeaderAction>
          <SaveAction
            onClick={this.onSave}
            disabled={this.store.isSaving}
            isNew={isNew}
          />
        </HeaderAction>
        <DropdownMenu label={<MoreIcon />}>
          <MenuItem onClick={this.store.togglePreview}>
            Toggle Preview
          </MenuItem>
          <MenuItem onClick={this.onCancel}>
            Cancel
          </MenuItem>
        </DropdownMenu>
      </Flex>
    );

    return (
      <Layout
        actions={actions}
        title={title}
        titleText={titleText}
        fixed
        loading={this.store.isSaving || this.store.isUploading}
        search={false}
      >
        {this.store.isFetching || !('Editor' in this.state)
          ? <CenteredContent>
              <AtlasPreviewLoading />
            </CenteredContent>
          : <this.state.Editor
              store={this.store}
              scrollTop={this.state.scrollTop}
              onScroll={this.onScroll}
              onSave={this.onSave}
              onCancel={this.onCancel}
              togglePreview={this.togglePreview}
            />}
      </Layout>
    );
  }
}

export default DocumentEdit;
