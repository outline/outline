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
    const { auth } = this.props;
    const user = auth.user ? auth.user.id : undefined;

    await Promise.all([
      this.props.documents.fetchRecentlyModified({ limit: 15 }),
      this.props.documents.fetchRecentlyViewed({ limit: 15 }),
      this.props.documents.fetchOwned({ limit: 15, user }),
    ]);
    this.isLoaded = true;
  };

  renderTab = (path, documents) => {
    return (
      <Route path={path}>
        {this.isLoaded || documents.length ? (
          <DocumentList documents={documents} showCollection />
        ) : (
          <ListPlaceholder count={5} />
        )}
      </Route>
    );
  };

  render() {
    const { documents, auth } = this.props;
    if (!auth.user) return;

    const createdDocuments = documents.owned(auth.user.id);

    return (
      <CenteredContent>
        <PageTitle title="Home" />
        <h1>Home</h1>
        <Tabs>
          <Tab to="/dashboard" exact>
            Recently updated
          </Tab>
          <Tab to="/dashboard/recent" exact>
            Recently viewed
          </Tab>
          <Tab to="/dashboard/created">Created by me</Tab>
        </Tabs>
        <Switch>
          {this.renderTab('/dashboard/recent', documents.recentlyViewed)}
          {this.renderTab('/dashboard/created', createdDocuments)}
          {this.renderTab('/dashboard', documents.recentlyEdited)}
        </Switch>
        <Actions align="center" justify="flex-end">
          <Action>
            <NewDocumentMenu label={<NewDocumentIcon />} />
          </Action>
        </Actions>
      </CenteredContent>
    );
  }
}

export default inject('documents', 'auth')(Dashboard);
