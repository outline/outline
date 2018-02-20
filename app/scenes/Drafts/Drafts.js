// @flow
import React, { Component } from 'react';
import { observer, inject } from 'mobx-react';
import CenteredContent from 'components/CenteredContent';
import { ListPlaceholder } from 'components/LoadingPlaceholder';
import Empty from 'components/Empty';
import PageTitle from 'components/PageTitle';
import DocumentList from 'components/DocumentList';
import DocumentsStore from 'stores/DocumentsStore';

@observer
class Drafts extends Component {
  props: {
    documents: DocumentsStore,
  };

  componentDidMount() {
    this.props.documents.fetchDrafts();
  }

  render() {
    const { isLoaded, isFetching, drafts } = this.props.documents;
    const showLoading = !isLoaded && isFetching;
    const showEmpty = isLoaded && !drafts.length;

    return (
      <CenteredContent column auto>
        <PageTitle title="Drafts" />
        <h1>Drafts</h1>
        {showLoading && <ListPlaceholder />}
        {showEmpty && <Empty>No drafts yet.</Empty>}
        <DocumentList documents={drafts} showCollection />
      </CenteredContent>
    );
  }
}

export default inject('documents')(Drafts);
