import { observer } from "mobx-react";
import { HomeIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { Switch, Route, Redirect, useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import { Action } from "~/components/Actions";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import InputSearchPage from "~/components/InputSearchPage";
import LanguagePrompt from "~/components/LanguagePrompt";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import PinnedDocuments from "~/components/PinnedDocuments";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Scene from "~/components/Scene";
import { Tab, Tabs } from "~/components/Tabs";
import useCurrentUser from "~/hooks/useCurrentUser";
import { usePinnedDocuments } from "~/hooks/usePinnedDocuments";
import usePersistedState from "~/hooks/usePersistedState";
import useStores from "~/hooks/useStores";
import NewDocumentMenu from "~/menus/NewDocumentMenu";

enum HomeTab {
  Viewed = "",
  Popular = "popular",
  Updated = "recent",
  Created = "created",
}

function Home() {
  const { documents, ui } = useStores();
  const user = useCurrentUser();
  const { t } = useTranslation();
  const userId = user?.id;
  const { pins, count } = usePinnedDocuments("home");
  const [homeTab, setHomeTab] = usePersistedState<HomeTab>(
    "home-tab",
    HomeTab.Viewed,
    {
      listen: false,
    }
  );

  // When landing on the index the last viewed tab is restored, the tabs are
  // hidden until the redirect resolves so that the active indicator does not
  // animate across from the first tab on mount.
  const isIndex = !!useRouteMatch({ path: "/home", exact: true });
  const redirectTo =
    isIndex && homeTab !== HomeTab.Viewed ? `/home/${homeTab}` : undefined;

  const recentlyViewed = (
    <PaginatedDocumentList
      key="recent"
      documents={documents.recentlyViewed}
      fetch={documents.fetchRecentlyViewed}
      empty={
        <Empty>
          {t("Documents you’ve recently viewed will be here for easy access")}
        </Empty>
      }
      showCollection
    />
  );

  return (
    <Scene
      icon={<HomeIcon />}
      title={t("Home")}
      left={
        <InputSearchPage source="dashboard" label={t("Search documents")} />
      }
      actions={
        <Action>
          <NewDocumentMenu />
        </Action>
      }
    >
      <ResizingHeightContainer>
        {!ui.languagePromptDismissed && <LanguagePrompt key="language" />}
      </ResizingHeightContainer>
      <Heading>{t("Home")}</Heading>
      <PinnedDocuments
        pins={pins}
        placeholderCount={count}
        collapseKey="home"
      />
      <Documents>
        {!redirectTo && (
          <Tabs>
            <Tab to="/home" exact onClick={() => setHomeTab(HomeTab.Viewed)}>
              {t("Recently viewed")}
            </Tab>
            <Tab
              to="/home/popular"
              exact
              onClick={() => setHomeTab(HomeTab.Popular)}
            >
              {t("Popular")}
            </Tab>
            <Tab
              to="/home/recent"
              exact
              onClick={() => setHomeTab(HomeTab.Updated)}
            >
              {t("Recently updated")}
            </Tab>
            <Tab to="/home/created" onClick={() => setHomeTab(HomeTab.Created)}>
              {t("Created by me")}
            </Tab>
          </Tabs>
        )}
        <Switch>
          <Route path="/home" exact>
            {redirectTo ? <Redirect to={redirectTo} /> : recentlyViewed}
          </Route>
          <Route path="/home/recent">
            <PaginatedDocumentList
              documents={documents.recentlyUpdated}
              fetch={documents.fetchRecentlyUpdated}
              empty={<Empty>{t("Weird, this shouldn't ever be empty")}</Empty>}
              showCollection
            />
          </Route>
          <Route path="/home/popular">
            <PaginatedDocumentList
              key="popular"
              documents={documents.popular}
              fetch={documents.fetchPopular}
              empty={
                <Empty>
                  {t("Documents with recent activity will appear here")}
                </Empty>
              }
              showCollection
            />
          </Route>
          <Route path="/home/created">
            <PaginatedDocumentList
              key="created"
              documents={documents.createdByUser(userId)}
              fetch={documents.fetchOwned}
              options={{
                userId,
              }}
              empty={
                <Empty>{t("You haven’t created any documents yet")}</Empty>
              }
              showCollection
            />
          </Route>
          <Route path="/home">{recentlyViewed}</Route>
        </Switch>
      </Documents>
    </Scene>
  );
}

const Documents = styled.div`
  position: relative;
  background: ${s("background")};
`;

export default observer(Home);
