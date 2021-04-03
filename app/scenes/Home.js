// @flow
import { observer } from "mobx-react";
import { HomeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { Switch, Route } from "react-router-dom";
import { Action } from "components/Actions";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import InputSearch from "components/InputSearch";
import LanguagePrompt from "components/LanguagePrompt";
import Scene from "components/Scene";
import Tab from "components/Tab";
import Tabs from "components/Tabs";
import PaginatedDocumentList from "../components/PaginatedDocumentList";
import useStickyState from "../hooks/useStickyState";
import useStores from "../hooks/useStores";
import NewDocumentMenu from "menus/NewDocumentMenu";

function useWelcomeMessage() {
  const { t } = useTranslation();

  const hour = new Date().getHours();
  if (hour >= 17) {
    return t("Good evening");
  }
  if (hour >= 12) {
    return t("Good afternoon");
  }
  return t("Good morning");
}

function Home() {
  const [previousSession] = useStickyState<string>("", "previous-session");
  const welcomeMessage = useWelcomeMessage();
  const { documents, ui, auth } = useStores();
  const { t } = useTranslation();

  if (!auth.user || !auth.team) return null;
  const user = auth.user.id;

  const recent = previousSession
    ? documents.updatedSinceTimestamp(previousSession)
    : [];

  return (
    <Scene
      icon={<HomeIcon color="currentColor" />}
      title={t("Home")}
      actions={
        <>
          <Action>
            <InputSearch
              source="dashboard"
              label={t("Search documents")}
              labelHidden
            />
          </Action>
          <Action>
            <NewDocumentMenu />
          </Action>
        </>
      }
    >
      {!ui.languagePromptDismissed && <LanguagePrompt />}
      <Heading>{welcomeMessage},</Heading>
      <HelpText style={{ marginTop: -12 }}>
        {recent.length ? (
          <Trans
            i18nKey="welcome"
            count={recent.length}
            defaults="{{ count }} docs were updated since you were last here"
            values={{ count: recent.length > 10 ? "10+" : recent.length }}
          />
        ) : (
          t("Here’s an overview of what’s been happening recently…")
        )}
      </HelpText>
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
