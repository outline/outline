// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Redirect, Link, Switch, Route } from 'react-router-dom';

import styled, { withTheme } from 'styled-components';
import {
  CollectionIcon,
  PrivateCollectionIcon,
  NewDocumentIcon,
  PlusIcon,
  PinIcon,
} from 'outline-icons';
import RichMarkdownEditor from 'rich-markdown-editor';

import { newDocumentUrl, collectionUrl } from 'utils/routeHelpers';
import CollectionsStore from 'stores/CollectionsStore';
import DocumentsStore from 'stores/DocumentsStore';
import PoliciesStore from 'stores/PoliciesStore';
import UiStore from 'stores/UiStore';
import Collection from 'models/Collection';

import Search from 'scenes/Search';
import CollectionEdit from 'scenes/CollectionEdit';
import CollectionMenu from 'menus/CollectionMenu';
import Actions, { Action, Separator } from 'components/Actions';
import Heading from 'components/Heading';
import Tooltip from 'components/Tooltip';
import CenteredContent from 'components/CenteredContent';
import { ListPlaceholder } from 'components/LoadingPlaceholder';
import InputSearch from 'components/InputSearch';
import Mask from 'components/Mask';
import Button from 'components/Button';
import HelpText from 'components/HelpText';
import DocumentList from 'components/DocumentList';
import Subheading from 'components/Subheading';
import PageTitle from 'components/PageTitle';
import Flex from 'shared/components/Flex';
import Modal from 'components/Modal';
import CollectionMembers from 'scenes/CollectionMembers';
import Tabs from 'components/Tabs';
import Tab from 'components/Tab';
import PaginatedDocumentList from 'components/PaginatedDocumentList';

type Props = {
  ui: UiStore,
  documents: DocumentsStore,
  collections: CollectionsStore,
  policies: PoliciesStore,
  match: Object,
  theme: Object,
};

@observer
class CollectionScene extends React.Component<Props> {
  @observable collection: ?Collection;
  @observable isFetching: boolean = true;
  @observable permissionsModalOpen: boolean = false;
  @observable editModalOpen: boolean = false;
  @observable redirectTo: ?string;

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

      await this.props.documents.fetchPinned({
        collectionId: id,
      });
    }

    this.isFetching = false;
  };

  onNewDocument = (ev: SyntheticEvent<>) => {
    ev.preventDefault();

    if (this.collection) {
      this.redirectTo = newDocumentUrl(this.collection.id);
    }
  };

  onPermissions = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.permissionsModalOpen = true;
  };

  handlePermissionsModalClose = () => {
    this.permissionsModalOpen = false;
  };

  handleEditModalOpen = () => {
    this.editModalOpen = true;
  };

  handleEditModalClose = () => {
    this.editModalOpen = false;
  };

  renderActions() {
    const { match, policies } = this.props;
    const can = policies.abilities(match.params.id);

    return (
      <Actions align="center" justify="flex-end">
        {can.update && (
          <React.Fragment>
            <Action>
              <InputSearch
                placeholder="Search in collection…"
                collectionId={match.params.id}
              />
            </Action>
            <Action>
              <Tooltip
                tooltip="New document"
                shortcut="n"
                delay={500}
                placement="bottom"
              >
                <Button onClick={this.onNewDocument} icon={<PlusIcon />}>
                  New doc
                </Button>
              </Tooltip>
            </Action>
            <Separator />
          </React.Fragment>
        )}
        <Action>
          <CollectionMenu collection={this.collection} />
        </Action>
      </Actions>
    );
  }

  render() {
    const { documents, theme } = this.props;

    if (this.redirectTo) return <Redirect to={this.redirectTo} push />;
    if (!this.isFetching && !this.collection) return <Search notFound />;

    const pinnedDocuments = this.collection
      ? documents.pinnedInCollection(this.collection.id)
      : [];
    const hasPinnedDocuments = !!pinnedDocuments.length;
    const collection = this.collection;

    return (
      <CenteredContent>
        {collection ? (
          <React.Fragment>
            <PageTitle title={collection.name} />
            {collection.isEmpty ? (
              <Centered column>
                <HelpText>
                  <strong>{collection.name}</strong> doesn’t contain any
                  documents yet.<br />Get started by creating a new one!
                </HelpText>
                <Wrapper>
                  <Link to={newDocumentUrl(collection.id)}>
                    <Button icon={<NewDocumentIcon color={theme.buttonText} />}>
                      Create a document
                    </Button>
                  </Link>&nbsp;&nbsp;
                  {collection.private && (
                    <Button onClick={this.onPermissions} neutral>
                      Manage members…
                    </Button>
                  )}
                </Wrapper>
                <Modal
                  title="Collection permissions"
                  onRequestClose={this.handlePermissionsModalClose}
                  isOpen={this.permissionsModalOpen}
                >
                  <CollectionMembers
                    collection={this.collection}
                    onSubmit={this.handlePermissionsModalClose}
                    onEdit={this.handleEditModalOpen}
                  />
                </Modal>
                <Modal
                  title="Edit collection"
                  onRequestClose={this.handleEditModalClose}
                  isOpen={this.editModalOpen}
                >
                  <CollectionEdit
                    collection={this.collection}
                    onSubmit={this.handleEditModalClose}
                  />
                </Modal>
              </Centered>
            ) : (
              <React.Fragment>
                <Heading>
                  {collection.private ? (
                    <PrivateCollectionIcon
                      color={collection.color}
                      size={40}
                      expanded
                    />
                  ) : (
                    <CollectionIcon
                      color={collection.color}
                      size={40}
                      expanded
                    />
                  )}{' '}
                  {collection.name}
                </Heading>

                {collection.description && (
                  <RichMarkdownEditor
                    id={collection.id}
                    key={collection.description}
                    defaultValue={collection.description}
                    theme={theme}
                    readOnly
                  />
                )}

                {hasPinnedDocuments && (
                  <React.Fragment>
                    <Subheading>
                      <TinyPinIcon size={18} /> Pinned
                    </Subheading>
                    <DocumentList documents={pinnedDocuments} showPin />
                  </React.Fragment>
                )}

                <Tabs>
                  <Tab to={collectionUrl(collection.id)} exact>
                    Recently updated
                  </Tab>
                  <Tab to={collectionUrl(collection.id, 'recent')} exact>
                    Recently published
                  </Tab>
                  <Tab to={collectionUrl(collection.id, 'old')} exact>
                    Least recently updated
                  </Tab>
                  <Tab to={collectionUrl(collection.id, 'alphabetical')} exact>
                    A–Z
                  </Tab>
                </Tabs>
                <Switch>
                  <Route path={collectionUrl(collection.id, 'alphabetical')}>
                    <PaginatedDocumentList
                      key="alphabetical"
                      documents={documents.alphabeticalInCollection(
                        collection.id
                      )}
                      fetch={documents.fetchAlphabetical}
                      options={{ collection: collection.id }}
                      showPin
                    />
                  </Route>
                  <Route path={collectionUrl(collection.id, 'old')}>
                    <PaginatedDocumentList
                      key="old"
                      documents={documents.leastRecentlyUpdatedInCollection(
                        collection.id
                      )}
                      fetch={documents.fetchLeastRecentlyUpdated}
                      options={{ collection: collection.id }}
                      showPin
                    />
                  </Route>
                  <Route path={collectionUrl(collection.id, 'recent')}>
                    <PaginatedDocumentList
                      key="recent"
                      documents={documents.recentlyPublishedInCollection(
                        collection.id
                      )}
                      fetch={documents.fetchRecentlyPublished}
                      options={{ collection: collection.id }}
                      showPublished
                      showPin
                    />
                  </Route>
                  <Route path={collectionUrl(collection.id)}>
                    <PaginatedDocumentList
                      documents={documents.recentlyUpdatedInCollection(
                        collection.id
                      )}
                      fetch={documents.fetchRecentlyUpdated}
                      options={{ collection: collection.id }}
                      showPin
                    />
                  </Route>
                </Switch>
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

const Centered = styled(Flex)`
  text-align: center;
  margin: 40vh auto 0;
  max-width: 380px;
  transform: translateY(-50%);
`;

const TinyPinIcon = styled(PinIcon)`
  position: relative;
  top: 4px;
  opacity: 0.8;
`;

const Wrapper = styled(Flex)`
  justify-content: center;
  margin: 10px 0;
`;

export default inject('collections', 'policies', 'documents', 'ui')(
  withTheme(CollectionScene)
);
