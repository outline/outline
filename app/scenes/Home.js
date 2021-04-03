// @flow
import { observer } from "mobx-react";
import { HomeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
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
import useStores from "hooks/useStores";
import NewDocumentMenu from "menus/NewDocumentMenu";

function Home() {
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
          <Heading>
            <span role="img" aria-label="Hello">
              👋
            </span>
            &nbsp;{t("Welcome")},
          </Heading>
          <Onboarding>
            Check out the example documents we created for you below and then
            create a new collection of your own in the left sidebar to get
            started…
          </Onboarding>
        </>
      )}
      {userOnboarding && (
        <>
          <Heading>
            <span role="img" aria-label="Hello">
              👋
            </span>
            &nbsp;{t("Welcome")},
          </Heading>
          <Onboarding>
            Outline is a place for your team to easily store and find knowledge.
            Start in the left sidebar to explore what other team members have
            created so far…
          </Onboarding>
        </>
      )}
      {!onboarding && <Heading>{t("Home")}</Heading>}
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
