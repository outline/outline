// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import CenteredContent from 'components/CenteredContent';
import { ListPlaceholder } from 'components/LoadingPlaceholder';
import Empty from 'components/Empty';
import PageTitle from 'components/PageTitle';
import DocumentList from 'components/DocumentList';
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
      </CenteredContent>
    );
  }
}

export default inject('documents')(Starred);
