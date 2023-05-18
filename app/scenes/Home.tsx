import { observer } from "mobx-react";
import { HomeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Switch, Route } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import { Action } from "~/components/Actions";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import InputSearchPage from "~/components/InputSearchPage";
import LanguagePrompt from "~/components/LanguagePrompt";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import PinnedDocuments from "~/components/PinnedDocuments";
import Scene from "~/components/Scene";
import Tab from "~/components/Tab";
import Tabs from "~/components/Tabs";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import NewDocumentMenu from "~/menus/NewDocumentMenu";

function Home() {
  const { documents, pins, ui } = useStores();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const userId = user?.id;
  const { t } = useTranslation();

  React.useEffect(() => {
    pins.fetchPage();
  }, [pins]);

  const canManageTeam = usePolicy(team).manage;

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
      {!ui.languagePromptDismissed && <LanguagePrompt />}
      <Heading>{t("Home")}</Heading>
      <PinnedDocuments pins={pins.home} canUpdate={canManageTeam} />
      <Documents>
        <Tabs>
          <Tab to="/home" exact>
            {t("Recently viewed")}
          </Tab>
          <Tab to="/home/recent" exact>
            {t("Recently updated")}
          </Tab>
          <Tab to="/home/created">{t("Created by me")}</Tab>
        </Tabs>
        <Switch>
          <Route path="/home/recent">
            <PaginatedDocumentList
              documents={documents.recentlyUpdated}
              fetch={documents.fetchRecentlyUpdated}
              empty={<Empty>{t("Weird, this shouldn’t ever be empty")}</Empty>}
              showCollection
            />
          </Route>
          <Route path="/home/created">
            <PaginatedDocumentList
              key="created"
              documents={documents.createdByUser(userId)}
              fetch={documents.fetchOwned}
              options={{
                user: userId,
              }}
              empty={
                <Empty>{t("You haven’t created any documents yet")}</Empty>
              }
              showCollection
            />
          </Route>
          <Route path="/home">
            <PaginatedDocumentList
              key="recent"
              documents={documents.recentlyViewed}
              fetch={documents.fetchRecentlyViewed}
              empty={
                <Empty>
                  {t(
                    "Documents you’ve recently viewed will be here for easy access"
                  )}
                </Empty>
              }
              showCollection
            />
          </Route>
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
