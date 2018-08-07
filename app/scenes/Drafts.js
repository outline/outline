// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { NewDocumentIcon } from 'outline-icons';

import CenteredContent from 'components/CenteredContent';
import { ListPlaceholder } from 'components/LoadingPlaceholder';
import Empty from 'components/Empty';
import PageTitle from 'components/PageTitle';
import DocumentList from 'components/DocumentList';
import NewDocumentMenu from 'menus/NewDocumentMenu';
import Actions, { Action } from 'components/Actions';
import DocumentsStore from 'stores/DocumentsStore';

type Props = {
  documents: DocumentsStore,
};

@observer
class Drafts extends React.Component<Props> {
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
        <Actions align="center" justify="flex-end">
          <Action>
            <NewDocumentMenu label={<NewDocumentIcon />} />
          </Action>
        </Actions>
      </CenteredContent>
    );
  }
}

export default inject('documents')(Drafts);
