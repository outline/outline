// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';

import CenteredContent from 'components/CenteredContent';
import { ListPlaceholder } from 'components/LoadingPlaceholder';
import Empty from 'components/Empty';
import PageTitle from 'components/PageTitle';
import Heading from 'components/Heading';
import PaginatedDocumentList from 'components/PaginatedDocumentList';
import Subheading from 'components/Subheading';
import DocumentsStore from 'stores/DocumentsStore';

type Props = {
  documents: DocumentsStore,
};

@observer
class Trash extends React.Component<Props> {
  componentDidMount() {
    this.props.documents.fetchArchived();
  }

  render() {
    const { documents } = this.props;
    const { isLoaded, isFetching, deleted } = documents;
    const showLoading = !isLoaded && isFetching;
    const showEmpty = isLoaded && !deleted.length;

    return (
      <CenteredContent column auto>
        <PageTitle title="Trash" />
        <Heading>Archive</Heading>
        {showEmpty ? (
          <Empty>The document archive is empty at the moment.</Empty>
        ) : (
          <React.Fragment>
            <Subheading>Documents</Subheading>
            <PaginatedDocumentList
              documents={documents.archived}
              fetch={documents.fetchArchived}
              link={false}
              showCollection
            />
          </React.Fragment>
        )}
        {showLoading && <ListPlaceholder />}
      </CenteredContent>
    );
  }
}

export default inject('documents')(Trash);
