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
import PaginatedNoteList from "~/components/PaginatedNoteList";
import PinnedNotes from "~/components/PinnedNotes";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Scene from "~/components/Scene";
import { Tab, Tabs } from "~/components/Tabs";
import useCurrentUser from "~/hooks/useCurrentUser";
import { usePinnedNotes } from "~/hooks/usePinnedNotes";
import usePersistedState from "~/hooks/usePersistedState";
import useStores from "~/hooks/useStores";
import NewNoteMenu from "~/menus/NewNoteMenu";
enum HomeTab {
  Viewed = "",
  Popular = "popular",
  Updated = "recent",
  Created = "created",
}
function Home() {
  const { notes, ui } = useStores();
  const user = useCurrentUser();
  const { t } = useTranslation();
  const userId = user?.id;
  const { pins, count } = usePinnedNotes("home");
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
    <PaginatedNoteList
      key="recent"
      notes={notes.recentlyViewed}
      fetch={notes.fetchRecentlyViewed}
      empty={
        <Empty>
          {t("Notes you’ve recently viewed will be here for easy access")}
        </Empty>
      }
      showNotebook
    />
  );
  return (
    <Scene
      icon={<HomeIcon />}
      title={t("Home")}
      left={<InputSearchPage source="dashboard" label={t("Search notes")} />}
      actions={
        <Action>
          <NewNoteMenu />
        </Action>
      }
    >
      <ResizingHeightContainer>
        {!ui.languagePromptDismissed && <LanguagePrompt key="language" />}
      </ResizingHeightContainer>
      <Heading>{t("Home")}</Heading>
      <PinnedNotes pins={pins} placeholderCount={count} collapseKey="home" />
      <Notes>
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
            <PaginatedNoteList
              notes={notes.recentlyUpdated}
              fetch={notes.fetchRecentlyUpdated}
              empty={<Empty>{t("Weird, this shouldn't ever be empty")}</Empty>}
              showNotebook
            />
          </Route>
          <Route path="/home/popular">
            <PaginatedNoteList
              key="popular"
              notes={notes.popular}
              fetch={notes.fetchPopular}
              empty={
                <Empty>
                  {t("Notes with recent activity will appear here")}
                </Empty>
              }
              showNotebook
            />
          </Route>
          <Route path="/home/created">
            <PaginatedNoteList
              key="created"
              notes={notes.createdByUser(userId)}
              fetch={notes.fetchOwned}
              options={{
                userId,
              }}
              empty={<Empty>{t("You haven’t created any notes yet")}</Empty>}
              showNotebook
            />
          </Route>
          <Route path="/home">{recentlyViewed}</Route>
        </Switch>
      </Notes>
    </Scene>
  );
}
const Notes = styled.div`
  position: relative;
  background: ${s("background")};
`;
export default observer(Home);
