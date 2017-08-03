// @flow
import React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Redirect } from 'react-router';
import { Link } from 'react-router-dom';
import _ from 'lodash';
import styled from 'styled-components';
import { newDocumentUrl } from 'utils/routeHelpers';

import CollectionsStore from 'stores/CollectionsStore';
import Collection from 'models/Collection';

import CenteredContent from 'components/CenteredContent';
import LoadingListPlaceholder from 'components/LoadingListPlaceholder';
import Button from 'components/Button';
import Flex from 'components/Flex';
import HelpText from 'components/HelpText';

type Props = {
  collections: CollectionsStore,
  match: Object,
};

@observer class CollectionScene extends React.Component {
  props: Props;
  collection: ?Collection;
  @observable isFetching = true;
  @observable redirectUrl;

  componentDidMount = () => {
    this.fetchDocument();
  };

  fetchDocument = async () => {
    const { collections } = this.props;
    const { id } = this.props.match.params;

    this.collection = await collections.getById(id);

    if (!this.collection) this.redirectUrl = '/404';

    if (this.collection && this.collection.documents.length > 0) {
      this.redirectUrl = this.collection.documents[0].url;
    }
    this.isFetching = false;
  };

  renderNewDocument() {
    return (
      <NewDocumentContainer auto column justify="center">
        <h1>Create a document</h1>
        <HelpText>
          Publish your first document to start building your collection.
        </HelpText>
        {this.collection &&
          <Action>
            <Link to={newDocumentUrl(this.collection)}>
              <Button>Create new document</Button>
            </Link>
          </Action>}
      </NewDocumentContainer>
    );
  }

  render() {
    return (
      <CenteredContent>
        {this.redirectUrl && <Redirect to={this.redirectUrl} />}
        {this.isFetching
          ? <LoadingListPlaceholder />
          : this.renderNewDocument()}
      </CenteredContent>
    );
  }
}

const NewDocumentContainer = styled(Flex)`
  padding-top: 70px;
`;

const Action = styled(Flex)`
  margin: 20px 0;
`;

export default inject('collections')(CollectionScene);
