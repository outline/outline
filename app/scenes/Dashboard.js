// @flow
import { observer, inject } from "mobx-react";
import * as React from "react";
import { Switch, Route } from "react-router-dom";

import AuthStore from "stores/AuthStore";
import DocumentsStore from "stores/DocumentsStore";
import Actions, { Action } from "components/Actions";
import CenteredContent from "components/CenteredContent";
import InputSearch from "components/InputSearch";
import PageTitle from "components/PageTitle";
import Tab from "components/Tab";
import Tabs from "components/Tabs";
import PaginatedDocumentList from "../components/PaginatedDocumentList";
import NewDocumentMenu from "menus/NewDocumentMenu";

type Props = {
  documents: DocumentsStore,
  auth: AuthStore,
};

@observer
class Dashboard extends React.Component<Props> {
  render() {
    const { documents, auth } = this.props;
    if (!auth.user || !auth.team) return null;
    const user = auth.user.id;

    return (
      <CenteredContent>
        <PageTitle title="Home" />
        <h1>Home</h1>
        <Tabs>
          <Tab to="/home" exact>
            Recently updated
          </Tab>
          <Tab to="/home/recent" exact>
            Recently viewed
          </Tab>
          <Tab to="/home/created">Created by me</Tab>
        </Tabs>
        <Switch>
          <Route path="/home/recent">
            <PaginatedDocumentList
              key="recent"
              documents={documents.recentlyViewed}
              fetch={documents.fetchRecentlyViewed}
              showCollection
            />
          </Route>
          <Route path="/home/created">
            <PaginatedDocumentList
              key="created"
              documents={documents.createdByUser(user)}
              fetch={documents.fetchOwned}
              options={{ user }}
              showCollection
            />
          </Route>
          <Route path="/home">
            <PaginatedDocumentList
              documents={documents.recentlyUpdated}
              fetch={documents.fetchRecentlyUpdated}
              showCollection
            />
          </Route>
        </Switch>
        <Actions align="center" justify="flex-end">
          <Action>
            <InputSearch source="dashboard" />
          </Action>
          <Action>
            <NewDocumentMenu />
          </Action>
        </Actions>
      </CenteredContent>
    );
  }
}

export default inject("documents", "auth")(Dashboard);
