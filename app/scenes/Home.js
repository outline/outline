// @flow
import { observer } from "mobx-react";
import { HomeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { Switch, Route } from "react-router-dom";
import styled from "styled-components";
import { Action } from "components/Actions";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import InputSearch from "components/InputSearch";
import LanguagePrompt from "components/LanguagePrompt";
import Scene from "components/Scene";
import Tab from "components/Tab";
import Tabs from "components/Tabs";
import PaginatedDocumentList from "../components/PaginatedDocumentList";
import useCurrentUser from "hooks/useCurrentUser";
import useQuery from "hooks/useQuery";
import useStickyState from "hooks/useStickyState";
import useStores from "hooks/useStores";
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
  const query = useQuery();
  const user = useCurrentUser();
  const { documents, ui } = useStores();
  const { t } = useTranslation();
  const userId = user.id;

  // see authentication middleware for where these query params are defined:
  // https://github.com/outline/outline/blob/ed2a42ac279e0ae23abcf846b621cf6bcf03e75f/server/middlewares/authentication.js#L165
  const teamOnboarding = query.get("newTeam") !== null;
  const userOnboarding = !teamOnboarding && query.get("newUser") !== null;
  const onboarding = teamOnboarding || userOnboarding;
  const showLanguagePrompt = !onboarding && !ui.languagePromptDismissed;

  console.log({ showLanguagePrompt, teamOnboarding, userOnboarding });

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
      {showLanguagePrompt && <LanguagePrompt />}
      {teamOnboarding && (
        <>
          <Heading>{t("Welcome")},</Heading>
          <Onboarding>
            Check out the example documents we created below and then get
            started by creating a new collection of your own in the left
            sidebar…
          </Onboarding>
        </>
      )}
      {userOnboarding && (
        <>
          <Heading>{t("Welcome")},</Heading>
          <Onboarding>
            Outline is a place for you and your team to easily store and find
            knowledge. Start in the left sidebar to explore what other team
            members have created so far…
          </Onboarding>
        </>
      )}
      {!onboarding && (
        <>
          <Heading>{welcomeMessage},</Heading>
          <Onboarding>
            {recent.length ? (
              <Trans
                i18nKey="welcome"
                count={recent.length}
                defaults="{{ count }} docs were updated since you were last here"
                values={{ count: recent.length > 10 ? "10+" : recent.length }}
              />
            ) : (
              t("Here’s an overview of what’s been happening recently")
            )}
            …
          </Onboarding>
        </>
      )}
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
            documents={documents.createdByUser(userId)}
            fetch={documents.fetchOwned}
            options={{ userId }}
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

const Onboarding = styled(HelpText)`
  margin-top: -12px;
  margin-bottom: 24px;
`;

export default observer(Home);
