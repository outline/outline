// @flow
import * as React from 'react';
import { Switch, Route } from 'react-router-dom';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { NewDocumentIcon } from 'outline-icons';

import DocumentsStore from 'stores/DocumentsStore';
import AuthStore from 'stores/AuthStore';
import NewDocumentMenu from 'menus/NewDocumentMenu';
import Actions, { Action } from 'components/Actions';
import CenteredContent from 'components/CenteredContent';
import DocumentList from 'components/DocumentList';
import PageTitle from 'components/PageTitle';
import Subheading from 'components/Subheading';
import Tabs from 'components/Tabs';
import Tab from 'components/Tab';
import { ListPlaceholder } from 'components/LoadingPlaceholder';

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
      this.props.documents.fetchRecentlyModified({ limit: 15 }),
      this.props.documents.fetchRecentlyViewed({ limit: 15 }),
    ]);
    this.isLoaded = true;
  };

  render() {
    const { documents, auth } = this.props;
    if (!auth.user) return;

    const hasRecentlyViewed = documents.recentlyViewed.length > 0;
    const hasRecentlyEdited = documents.recentlyEdited.length > 0;

    const owned = documents.owned(auth.user.id);
    const showContent =
      this.isLoaded || (hasRecentlyViewed && hasRecentlyEdited);

    return (
      <CenteredContent>
        <PageTitle title="Home" />
        <h1>Home</h1>
        <Tabs>
          <Tab to="/dashboard" exact>
            Recently edited
          </Tab>
          <Tab to="/dashboard/recent" exact>
            Recently viewed
          </Tab>
          <Tab to="/dashboard/owned">Created by me</Tab>
        </Tabs>
        {showContent ? (
          <React.Fragment>
            <Switch>
              <Route path="/dashboard/recent">
                <DocumentList
                  documents={documents.recentlyViewed}
                  showCollection
                />
              </Route>
              <Route path="/dashboard/owned">
                <DocumentList documents={owned} showCollection />
              </Route>
              <Route path="/dashboard">
                <DocumentList
                  documents={documents.recentlyEdited}
                  showCollection
                />
              </Route>
            </Switch>
            <Actions align="center" justify="flex-end">
              <Action>
                <NewDocumentMenu label={<NewDocumentIcon />} />
              </Action>
            </Actions>
          </React.Fragment>
        ) : (
          <ListPlaceholder count={5} />
        )}
      </CenteredContent>
    );
  }
}

export default inject('documents', 'auth')(Dashboard);
