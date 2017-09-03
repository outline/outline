// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import styled from 'styled-components';

import DocumentsStore from 'stores/DocumentsStore';
import DocumentList from 'components/DocumentList';
import PageTitle from 'components/PageTitle';
import CenteredContent from 'components/CenteredContent';
import { ListPlaceholder } from 'components/LoadingPlaceholder';

const Subheading = styled.h3`
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  color: #9FA6AB;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #ddd;
  padding-bottom: 10px;
  margin-top: 30px;
`;

type Props = {
  documents: DocumentsStore,
};

@observer class Dashboard extends React.Component {
  props: Props;

  componentDidMount() {
    this.props.documents.fetchRecentlyModified({ limit: 5 });
    this.props.documents.fetchRecentlyViewed({ limit: 5 });
  }

  get showPlaceholder() {
    const { isLoaded, isFetching } = this.props.documents;
    return !isLoaded && isFetching;
  }

  render() {
    return (
      <CenteredContent>
        <PageTitle title="Home" />
        <h1>Home</h1>
        <Subheading>Recently viewed</Subheading>
        {this.showPlaceholder && <ListPlaceholder />}
        <DocumentList documents={this.props.documents.recentlyViewed} />

        <Subheading>Recently edited</Subheading>
        <DocumentList documents={this.props.documents.recentlyEdited} />
        {this.showPlaceholder && <ListPlaceholder />}
      </CenteredContent>
    );
  }
}

export default inject('documents')(Dashboard);
