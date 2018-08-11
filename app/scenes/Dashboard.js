// @flow
import * as React from 'react';
import { Switch, Route } from 'react-router-dom';
import { observer, inject } from 'mobx-react';
import { NewDocumentIcon } from 'outline-icons';

import DocumentsStore from 'stores/DocumentsStore';
import AuthStore from 'stores/AuthStore';
import NewDocumentMenu from 'menus/NewDocumentMenu';
import Actions, { Action } from 'components/Actions';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import Tabs from 'components/Tabs';
import Tab from 'components/Tab';
import PaginatedDocumentList from '../components/PaginatedDocumentList';

type Props = {
  documents: DocumentsStore,
  auth: AuthStore,
};

@observer
class Dashboard extends React.Component<Props> {
  render() {
    const { documents, auth } = this.props;
    if (!auth.user) return;
    const user = auth.user.id;

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
          <Route path="/dashboard/recent">
            <PaginatedDocumentList
              key="recent"
              documents={documents.recentlyViewed}
              fetch={documents.fetchRecentlyViewed}
            />
          </Route>
          <Route path="/dashboard/created">
            <PaginatedDocumentList
              key="created"
              documents={documents.createdByUser(user)}
              fetch={documents.fetchOwned}
              options={{ user }}
            />
          </Route>
          <Route path="/dashboard">
            <PaginatedDocumentList
              documents={documents.recentlyEdited}
              fetch={documents.fetchRecentlyEdited}
            />
          </Route>
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
