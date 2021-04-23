// @flow
import { observer } from "mobx-react";
import { HomeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Switch, Route } from "react-router-dom";
import { Action } from "components/Actions";
import Heading from "components/Heading";
import InputSearchPage from "components/InputSearchPage";
import LanguagePrompt from "components/LanguagePrompt";
import Scene from "components/Scene";
import Tab from "components/Tab";
import Tabs from "components/Tabs";
import PaginatedDocumentList from "../components/PaginatedDocumentList";
import useStores from "../hooks/useStores";
import NewDocumentMenu from "menus/NewDocumentMenu";

function Home() {
  const { documents, ui, auth } = useStores();
  const { t } = useTranslation();

  if (!auth.user || !auth.team) return null;
  const user = auth.user.id;

  return (
    <Scene
      icon={<HomeIcon color="currentColor" />}
      title={t("Home")}
      actions={
        <>
          <Action>
            <InputSearchPage source="dashboard" label={t("Search documents")} />
          </Action>
          <Action>
            <NewDocumentMenu />
          </Action>
        </>
      }
    >
      {!ui.languagePromptDismissed && <LanguagePrompt />}
      <Heading>{t("Home")}</Heading>
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
    </Scene>
  );
}

export default observer(Home);
