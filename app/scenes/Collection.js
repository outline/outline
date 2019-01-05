// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter, Link } from 'react-router-dom';
import styled from 'styled-components';
import {
  CollectionIcon,
  PrivateCollectionIcon,
  NewDocumentIcon,
  PinIcon,
} from 'outline-icons';
import RichMarkdownEditor from 'rich-markdown-editor';

import { newDocumentUrl } from 'utils/routeHelpers';
import CollectionsStore from 'stores/CollectionsStore';
import DocumentsStore from 'stores/DocumentsStore';
import UiStore from 'stores/UiStore';
import Collection from 'models/Collection';

import Search from 'scenes/Search';
import CollectionMenu from 'menus/CollectionMenu';
import Actions, { Action, Separator } from 'components/Actions';
import Heading from 'components/Heading';
import CenteredContent from 'components/CenteredContent';
import { ListPlaceholder } from 'components/LoadingPlaceholder';
import Mask from 'components/Mask';
import Button from 'components/Button';
import HelpText from 'components/HelpText';
import DocumentList from 'components/DocumentList';
import Subheading from 'components/Subheading';
import PageTitle from 'components/PageTitle';
import Flex from 'shared/components/Flex';
import Modal from 'components/Modal';
import CollectionPermissions from 'scenes/CollectionPermissions';

type Props = {
  ui: UiStore,
  documents: DocumentsStore,
  collections: CollectionsStore,
  history: Object,
  match: Object,
};

@observer
class CollectionScene extends React.Component<Props> {
  @observable collection: ?Collection;
  @observable isFetching: boolean = true;
  @observable permissionsModalOpen: boolean = false;

  componentDidMount() {
    this.loadContent(this.props.match.params.id);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.match.params.id !== this.props.match.params.id) {
      this.loadContent(nextProps.match.params.id);
    }
  }

  componentWillUnmount() {
    this.props.ui.clearActiveCollection();
  }

  loadContent = async (id: string) => {
    const collection = await this.props.collections.fetch(id);

    if (collection) {
      this.props.ui.setActiveCollection(collection);
      this.collection = collection;

      await Promise.all([
        this.props.documents.fetchRecentlyUpdated({
          limit: 10,
          collection: id,
        }),
        this.props.documents.fetchPinned({
          collection: id,
        }),
      ]);
    }

    this.isFetching = false;
  };

  onNewDocument = (ev: SyntheticEvent<*>) => {
    ev.preventDefault();

    if (this.collection) {
      this.props.history.push(`${this.collection.url}/new`);
    }
  };

  onPermissions = (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    this.permissionsModalOpen = true;
  };

  handlePermissionsModalClose = () => {
    this.permissionsModalOpen = false;
  };

  renderActions() {
    return (
      <Actions align="center" justify="flex-end">
        <Action>
          <CollectionMenu
            history={this.props.history}
            collection={this.collection}
          />
        </Action>
        <Separator />
        <Action>
          <a onClick={this.onNewDocument}>
            <NewDocumentIcon />
          </a>
        </Action>
      </Actions>
    );
  }

  renderNotFound() {
    return <Search notFound />;
  }

  render() {
    if (!this.isFetching && !this.collection) {
      return this.renderNotFound();
    }

    const pinnedDocuments = this.collection
      ? this.props.documents.pinnedInCollection(this.collection.id)
      : [];
    const recentDocuments = this.collection
      ? this.props.documents.recentlyUpdatedInCollection(this.collection.id)
      : [];
    const hasPinnedDocuments = !!pinnedDocuments.length;
    const collection = this.collection;

    return (
      <CenteredContent>
        {collection ? (
          <React.Fragment>
            <PageTitle title={collection.name} />
            <Heading>
              {collection.private ? (
                <PrivateCollectionIcon
                  color={collection.color}
                  size={40}
                  expanded
                />
              ) : (
                <CollectionIcon color={collection.color} size={40} expanded />
              )}{' '}
              {collection.name}
            </Heading>
            {collection.isEmpty ? (
              <React.Fragment>
                <HelpText>
                  Collections are for grouping your knowledge base. Get started
                  by creating a new document.
                </HelpText>
                <Wrapper>
                  <Link to={newDocumentUrl(collection)}>
                    <Button>Create new document</Button>
                  </Link>&nbsp;&nbsp;
                  {collection.private && (
                    <Button onClick={this.onPermissions} neutral>
                      Invite people
                    </Button>
                  )}
                </Wrapper>
                <Modal
                  title="Collection permissions"
                  onRequestClose={this.handlePermissionsModalClose}
                  isOpen={this.permissionsModalOpen}
                >
                  <CollectionPermissions
                    collection={this.collection}
                    onSubmit={this.handlePermissionsModalClose}
                  />
                </Modal>
              </React.Fragment>
            ) : (
              <React.Fragment>
                {collection.description && (
                  <RichMarkdownEditor
                    key={collection.description}
                    defaultValue={collection.description}
                    readOnly
                  />
                )}

                {hasPinnedDocuments && (
                  <React.Fragment>
                    <Subheading>
                      <TinyPinIcon size={18} /> Pinned
                    </Subheading>
                    <DocumentList documents={pinnedDocuments} />
                  </React.Fragment>
                )}

                <Subheading>Recently edited</Subheading>
                <DocumentList documents={recentDocuments} limit={10} />
              </React.Fragment>
            )}

            {this.renderActions()}
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Heading>
              <Mask height={35} />
            </Heading>
            <ListPlaceholder count={5} />
          </React.Fragment>
        )}
      </CenteredContent>
    );
  }
}

const TinyPinIcon = styled(PinIcon)`
  position: relative;
  top: 4px;
  opacity: 0.8;
`;

const Wrapper = styled(Flex)`
  margin: 10px 0;
`;

export default withRouter(
  inject('collections', 'documents', 'ui')(CollectionScene)
);
