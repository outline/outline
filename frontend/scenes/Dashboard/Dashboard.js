// @flow
import React from 'react';
import { observer } from 'mobx-react';
import styled from 'styled-components';

import DocumentList from 'components/DocumentList';
import PageTitle from 'components/PageTitle';
import CenteredContent from 'components/CenteredContent';
import ViewedDocumentsStore from './ViewedDocumentsStore';
import EditedDocumentsStore from './EditedDocumentsStore';

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

type Props = {};

@observer class Dashboard extends React.Component {
  props: Props;
  viewedStore: ViewedDocumentsStore;
  editedStore: EditedDocumentsStore;

  constructor(props: Props) {
    super(props);
    this.viewedStore = new ViewedDocumentsStore();
    this.editedStore = new EditedDocumentsStore();
  }

  componentDidMount() {
    this.viewedStore.fetchDocuments();
    this.editedStore.fetchDocuments();
  }

  render() {
    return (
      <CenteredContent>
        <PageTitle title="Home" />
        <h1>Home</h1>
        <Subheading>Recently viewed</Subheading>
        <DocumentList documents={this.viewedStore.documents} />

        <Subheading>Recently edited</Subheading>
        <DocumentList documents={this.editedStore.documents} />
      </CenteredContent>
    );
  }
}

export default Dashboard;
