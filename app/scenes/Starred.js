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
class Starred extends React.Component<Props> {
  componentDidMount() {
    this.props.documents.fetchStarred();
  }

  render() {
    const { isLoaded, isFetching, starred } = this.props.documents;
    const showLoading = !isLoaded && isFetching;
    const showEmpty = isLoaded && !starred.length;

    return (
      <CenteredContent column auto>
        <PageTitle title="Starred" />
        <h1>Starred</h1>
        {showLoading && <ListPlaceholder />}
        {showEmpty && <Empty>No starred documents yet.</Empty>}
        <DocumentList documents={starred} />
        <Actions align="center" justify="flex-end">
          <Action>
            <NewDocumentMenu label={<NewDocumentIcon />} />
          </Action>
        </Actions>
      </CenteredContent>
    );
  }
}

export default inject('documents')(Starred);
