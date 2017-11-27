// @flow
import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter, Link } from 'react-router-dom';
import styled from 'styled-components';
import { newDocumentUrl } from 'utils/routeHelpers';

import CollectionsStore from 'stores/CollectionsStore';
import DocumentsStore from 'stores/DocumentsStore';
import UiStore from 'stores/UiStore';
import Collection from 'models/Collection';

import Search from 'scenes/Search';
import CollectionMenu from 'menus/CollectionMenu';
import Actions, { Action, Separator } from 'components/Actions';
import CenteredContent from 'components/CenteredContent';
import CollectionIcon from 'components/Icon/CollectionIcon';
import NewDocumentIcon from 'components/Icon/NewDocumentIcon';
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
class CollectionScene extends Component {
  props: Props;
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

  loadContent = async (id: string) => {
    const { collections } = this.props;

    const collection = collections.getById(id) || (await collections.fetch(id));

    if (collection) {
      this.props.ui.setActiveCollection(collection);
      this.collection = collection;
      await this.props.documents.fetchRecentlyModified({
        limit: 10,
        collection: collection.id,
      });
    }

    this.isFetching = false;
  };

  onNewDocument = (ev: SyntheticEvent) => {
    ev.preventDefault();

    if (this.collection) {
      this.props.history.push(`${this.collection.url}/new`);
    }
  };

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

    return (
      <CenteredContent>
        {this.collection ? (
          <span>
            <PageTitle title={this.collection.name} />
            <Heading>
              <CollectionIcon
                color={this.collection.color}
                size={40}
                expanded
              />{' '}
              {this.collection.name}
            </Heading>
            <Subheading>Recently edited</Subheading>
            <DocumentList
              documents={this.props.documents.recentlyEditedInCollection(
                this.collection.id
              )}
            />
            <Actions align="center" justify="flex-end">
              <Action>
                <CollectionMenu collection={this.collection} />
              </Action>
              <Separator />
              <Action>
                <a onClick={this.onNewDocument}>
                  <NewDocumentIcon />
                </a>
              </Action>
            </Actions>
          </span>
        ) : (
          <ListPlaceholder count={5} />
        )}
      </CenteredContent>
    );
  }
}

const Heading = styled.h1`
  display: flex;

  svg {
    margin-left: -6px;
    margin-right: 6px;
  }
`;

const Wrapper = styled(Flex)`
  margin: 10px 0;
`;

export default withRouter(
  inject('collections', 'documents', 'ui')(CollectionScene)
);
