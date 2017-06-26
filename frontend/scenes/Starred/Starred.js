// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import DocumentList from 'components/DocumentList';
import StarredStore from './StarredStore';

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
      <CenteredContent column auto>
        <PageTitle title="Starred" />
        <h1>Starred</h1>
        <DocumentList documents={this.store.documents} />
      </CenteredContent>
    );
  }
}

export default Starred;
