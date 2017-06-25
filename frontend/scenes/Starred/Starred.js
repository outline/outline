// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import CenteredContent from 'components/CenteredContent';
import Layout from 'components/Layout';
import PageTitle from 'components/PageTitle';
import DocumentList from 'components/DocumentList';
import StarredStore from './StarredStore';

const Container = styled(CenteredContent)`
  width: 100%;
  padding: 16px;
`;

@observer class Starred extends Component {
  store: StarredStore;

  constructor() {
    super();
    this.store = new StarredStore();
  }

  componentDidMount() {
    this.store.fetchDocuments();
  }

  render() {
    return (
      <Layout loading={this.store.isFetching}>
        <PageTitle title="Starred" />
        <Container column auto>
          <h1>Starred</h1>
          <DocumentList documents={this.store.documents} />
        </Container>
      </Layout>
    );
  }
}

export default Starred;
