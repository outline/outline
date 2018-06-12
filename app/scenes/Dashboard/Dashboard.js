// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';

import AuthStore from 'stores/AuthStore';
import DocumentsStore from 'stores/DocumentsStore';

import CenteredContent from 'components/CenteredContent';
import DocumentList from 'components/DocumentList';
import PageTitle from 'components/PageTitle';
import Subheading from 'components/Subheading';
import { ListPlaceholder } from 'components/LoadingPlaceholder';
import BannerSuspended from './components/BannerSuspended';
import BannerFreeLimit from './components/BannerFreeLimit';

type Props = {
  documents: DocumentsStore,
  auth: AuthStore,
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
    const { documents, auth } = this.props;
    const hasRecentlyViewed = documents.recentlyViewed.length > 0;
    const hasRecentlyEdited = documents.recentlyEdited.length > 0;
    const showContent =
      this.isLoaded || (hasRecentlyViewed && hasRecentlyEdited);
    const showTeamSuspended = auth.team && auth.team.isSuspended;
    const showFreeLimit = auth.team && auth.team.isNearFreeLimit;

    return (
      <CenteredContent>
        <PageTitle title="Home" />
        {showTeamSuspended && <BannerSuspended />}
        {showFreeLimit && <BannerFreeLimit />}

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

export default inject('documents', 'auth')(Dashboard);
