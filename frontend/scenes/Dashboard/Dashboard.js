// @flow
import React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import styled from 'styled-components';

import DocumentsStore from 'stores/DocumentsStore';
import Flex from 'components/Flex';
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
  @observable isLoaded = false;

  componentDidMount() {
    this.loadContent();
  }

  loadContent = async () => {
    await Promise.all([
      this.props.documents.fetchRecentlyModified({ limit: 5 }),
      this.props.documents.fetchRecentlyViewed({ limit: 5 }),
    ]);
    this.isLoaded = true;
  };

  render() {
    return (
      <CenteredContent>
        <PageTitle title="Home" />
        <h1>Home</h1>
        {this.isLoaded
          ? <Flex column>
              {this.props.documents.recentlyViewed.length > 0 &&
                <Flex column>
                  <Subheading>Recently viewed</Subheading>
                  <DocumentList
                    documents={this.props.documents.recentlyViewed}
                  />
                </Flex>}
              {this.props.documents.recentlyEdited.length > 0 &&
                <Flex column>
                  <Subheading>Recently edited</Subheading>
                  <DocumentList
                    documents={this.props.documents.recentlyEdited}
                  />
                </Flex>}
            </Flex>
          : <ListPlaceholder count={5} />}
      </CenteredContent>
    );
  }
}

export default inject('documents')(Dashboard);
