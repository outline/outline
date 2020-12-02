// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Switch, Route } from "react-router-dom";

import Actions, { Action } from "components/Actions";
import CenteredContent from "components/CenteredContent";
import InputSearch from "components/InputSearch";
import LanguagePrompt from "components/LanguagePrompt";
import PageTitle from "components/PageTitle";
import Tab from "components/Tab";
import Tabs from "components/Tabs";
import PaginatedDocumentList from "../components/PaginatedDocumentList";
import useStores from "../hooks/useStores";
import NewDocumentMenu from "menus/NewDocumentMenu";

function Dashboard() {
  const { documents, ui, auth } = useStores();
  const { t } = useTranslation();

  if (!auth.user || !auth.team) return null;
  const user = auth.user.id;

  return (
    <CenteredContent>
      <PageTitle title={t("Home")} />
      {!ui.languagePromptDismissed && <LanguagePrompt />}
      <h1>{t("Home")}</h1>
      <Tabs>
        <Tab to="/home" exact>
          {t("Recently updated")}
        </Tab>
        <Tab to="/home/recent" exact>
          {t("Recently viewed")}
        </Tab>
        <Tab to="/home/created">{t("Created by me")}</Tab>
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

export default observer(Dashboard);
