// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';

import Heading from 'components/Heading';
import CenteredContent from 'components/CenteredContent';
import { ListPlaceholder } from 'components/LoadingPlaceholder';
import Empty from 'components/Empty';
import PageTitle from 'components/PageTitle';
import DocumentList from 'components/DocumentList';
import Subheading from 'components/Subheading';
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
        <Heading>Drafts</Heading>
        {showLoading && <ListPlaceholder />}
        {showEmpty ? (
          <Empty>You’ve not got any drafts at the moment.</Empty>
        ) : (
          <React.Fragment>
            <Subheading>Documents</Subheading>
            <DocumentList documents={drafts} showCollection />
          </React.Fragment>
        )}
        <Actions align="center" justify="flex-end">
          <Action>
            <NewDocumentMenu />
          </Action>
        </Actions>
      </CenteredContent>
    );
  }
}

export default inject('documents')(Drafts);
