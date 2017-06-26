// @flow
import React from 'react';
import { observer } from 'mobx-react';
import styled from 'styled-components';

import DocumentList from 'components/DocumentList';
import PageTitle from 'components/PageTitle';
import CenteredContent from 'components/CenteredContent';
import RecentDocumentsStore from './RecentDocumentsStore';

const Subheading = styled.h3`
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  color: #9FA6AB;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #ddd;
  padding-bottom: 10px;
`;

type Props = {};

@observer class Dashboard extends React.Component {
  props: Props;
  store: RecentDocumentsStore;

  constructor(props: Props) {
    super(props);
    this.store = new RecentDocumentsStore();
  }

  componentDidMount() {
    this.store.fetchDocuments();
  }

  render() {
    return (
      <CenteredContent>
        <PageTitle title="Home" />
        <h1>Home</h1>
        <Subheading>Recently viewed</Subheading>
        <DocumentList documents={this.store.documents} />

      </CenteredContent>
    );
  }
}

export default Dashboard;
