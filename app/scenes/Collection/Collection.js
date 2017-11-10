// @flow
import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Link, Redirect } from 'react-router-dom';
import styled from 'styled-components';
import { newDocumentUrl } from 'utils/routeHelpers';

import CollectionsStore from 'stores/CollectionsStore';
import Collection from 'models/Collection';

import CenteredContent from 'components/CenteredContent';
import LoadingListPlaceholder from 'components/LoadingListPlaceholder';
import Button from 'components/Button';
import HelpText from 'components/HelpText';
import Flex from 'shared/components/Flex';

type Props = {
  collections: CollectionsStore,
  match: Object,
};

@observer
class CollectionScene extends Component {
  props: Props;
  @observable collection: ?Collection;
  @observable isFetching = true;
  @observable redirectUrl;

  componentDidMount = () => {
    this.fetchDocument(this.props.match.params.id);
  };

  componentWillReceiveProps(nextProps) {
    if (nextProps.match.params.id !== this.props.match.params.id) {
      this.fetchDocument(nextProps.match.params.id);
    }
  }

  fetchDocument = async (id: string) => {
    const { collections } = this.props;

    this.collection = await collections.fetchById(id);

    if (!this.collection) this.redirectUrl = '/404';

    if (this.collection && this.collection.documents.length > 0) {
      this.redirectUrl = this.collection.documents[0].url;
    }
    this.isFetching = false;
  };

  renderEmptyCollection() {
    if (!this.collection) return;

    return (
      <NewDocumentContainer auto column justify="center">
        <h1>Create a document</h1>
        <HelpText>
          Publish your first document to start building the{' '}
          <strong>{this.collection.name}</strong> collection.
        </HelpText>
        <Action>
          <Link to={newDocumentUrl(this.collection)}>
            <Button>Create new document</Button>
          </Link>
        </Action>
      </NewDocumentContainer>
    );
  }

  render() {
    if (this.redirectUrl) return <Redirect to={this.redirectUrl} />;

    return (
      <CenteredContent>
        {this.isFetching ? (
          <LoadingListPlaceholder />
        ) : (
          this.renderEmptyCollection()
        )}
      </CenteredContent>
    );
  }
}

const NewDocumentContainer = styled(Flex)`
  padding-top: 50%;
  transform: translateY(-50%);
`;

const Action = styled(Flex)`
  margin: 10px 0;
`;

export default inject('collections')(CollectionScene);
