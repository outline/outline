// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';

import DocumentsStore from 'stores/DocumentsStore';
import CenteredContent from 'components/CenteredContent';
import DocumentList from 'components/DocumentList';
import PageTitle from 'components/PageTitle';
import Subheading from 'components/Subheading';
import { ListPlaceholder } from 'components/LoadingPlaceholder';

type Props = {
  documents: DocumentsStore,
};

@observer
class Dashboard extends React.Component<Props> {
  @observable isLoaded: boolean = false;

  componentDidMount() {
    this.loadContent();
  }

  loadContent = async () => {
    await Promise.all([
      this.props.documents.fetchRecentlyModified({ limit: 5 }),
      this.props.documents.fetchRecentlyViewed({ limit: 5 }),
    ]);
    this.isLoaded = true;
  };

  render() {
    const { documents } = this.props;
    const hasRecentlyViewed = documents.recentlyViewed.length > 0;
    const hasRecentlyEdited = documents.recentlyEdited.length > 0;
    const showContent =
      this.isLoaded || (hasRecentlyViewed && hasRecentlyEdited);

    return (
      <CenteredContent>
        <PageTitle title="Home" />
        <h1>Home</h1>
        {showContent ? (
          <span>
            {hasRecentlyViewed && [
              <Subheading key="viewed">Recently viewed</Subheading>,
              <DocumentList
                key="viewedDocuments"
                documents={documents.recentlyViewed}
              />,
            ]}
            {hasRecentlyEdited && [
              <Subheading key="edited">Recently edited</Subheading>,
              <DocumentList
                key="editedDocuments"
                documents={documents.recentlyEdited}
              />,
            ]}
          </span>
        ) : (
          <ListPlaceholder count={5} />
        )}
      </CenteredContent>
    );
  }
}

export default inject('documents')(Dashboard);
