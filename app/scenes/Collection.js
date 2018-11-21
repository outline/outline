// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter, Link } from 'react-router-dom';
import styled from 'styled-components';
import { CollectionIcon, NewDocumentIcon, PinIcon } from 'outline-icons';
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
import Button from 'components/Button';
import HelpText from 'components/HelpText';
import DocumentList from 'components/DocumentList';
import Subheading from 'components/Subheading';
import PageTitle from 'components/PageTitle';
import Flex from 'shared/components/Flex';

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
    const { collections } = this.props;
    const collection = collections.getById(id) || (await collections.fetch(id));

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

  renderEmptyCollection() {
    if (!this.collection) return;

    return (
      <CenteredContent>
        <PageTitle title={this.collection.name} />
        <Heading>
          <CollectionIcon color={this.collection.color} size={40} expanded />{' '}
          {this.collection.name}
        </Heading>
        <HelpText>
          Publish your first document to start building this collection.
        </HelpText>
        <Wrapper>
          <Link to={newDocumentUrl(this.collection)}>
            <Button>Create new document</Button>
          </Link>
        </Wrapper>
        {this.renderActions()}
      </CenteredContent>
    );
  }

  renderNotFound() {
    return <Search notFound />;
  }

  render() {
    if (!this.isFetching && !this.collection) {
      return this.renderNotFound();
    }
    if (this.collection && this.collection.isEmpty) {
      return this.renderEmptyCollection();
    }

    const pinnedDocuments = this.collection
      ? this.props.documents.pinnedInCollection(this.collection.id)
      : [];
    const recentDocuments = this.collection
      ? this.props.documents.recentlyUpdatedInCollection(this.collection.id)
      : [];
    const hasPinnedDocuments = !!pinnedDocuments.length;

    return (
      <CenteredContent>
        {this.collection ? (
          <React.Fragment>
            <PageTitle title={this.collection.name} />
            <Heading>
              <CollectionIcon
                color={this.collection.color}
                size={40}
                expanded
              />{' '}
              {this.collection.name}
            </Heading>
            {this.collection.description && (
              <RichMarkdownEditor
                key={this.collection.description}
                defaultValue={this.collection.description}
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
            {this.renderActions()}
          </React.Fragment>
        ) : (
          <ListPlaceholder count={5} />
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
