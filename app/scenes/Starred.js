// @flow
import { observer } from "mobx-react";
import { StarredIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { type Match } from "react-router-dom";
import { Action } from "components/Actions";
import Empty from "components/Empty";
import Heading from "components/Heading";
import InputSearchPage from "components/InputSearchPage";
import PaginatedDocumentList from "components/PaginatedDocumentList";
import Scene from "components/Scene";
import Tab from "components/Tab";
import Tabs from "components/Tabs";
import useStores from "hooks/useStores";
import NewDocumentMenu from "menus/NewDocumentMenu";

type Props = {
  match: Match,
};

function Starred(props: Props) {
  const { documents } = useStores();
  const { t } = useTranslation();
  const { fetchStarred, starred, starredAlphabetical } = documents;
  const { sort } = props.match.params;

  return (
    <Scene
      icon={<StarredIcon color="currentColor" />}
      title={t("Starred")}
      actions={
        <>
          <Action>
            <InputSearchPage source="starred" label={t("Search documents")} />
          </Action>
          <Action>
            <NewDocumentMenu />
          </Action>
        </>
      }
    >
      <Heading>{t("Starred")}</Heading>
      <PaginatedDocumentList
        heading={
          <Tabs>
            <Tab to="/starred" exact>
              {t("Recently updated")}
            </Tab>
            <Tab to="/starred/alphabetical" exact>
              {t("Alphabetical")}
            </Tab>
          </Tabs>
        }
        empty={<Empty>{t("You’ve not starred any documents yet.")}</Empty>}
        fetch={fetchStarred}
        documents={sort === "alphabetical" ? starredAlphabetical : starred}
        showCollection
      />
    </Scene>
  );
}

export default observer(Starred);
