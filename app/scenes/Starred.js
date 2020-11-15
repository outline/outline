// @flow
import { observer, inject } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { type Match } from "react-router-dom";
import DocumentsStore from "stores/DocumentsStore";
import Actions, { Action } from "components/Actions";
import CenteredContent from "components/CenteredContent";
import Empty from "components/Empty";
import Heading from "components/Heading";
import InputSearch from "components/InputSearch";
import PageTitle from "components/PageTitle";
import PaginatedDocumentList from "components/PaginatedDocumentList";
import Tab from "components/Tab";
import Tabs from "components/Tabs";
import NewDocumentMenu from "menus/NewDocumentMenu";

type Props = {
  documents: DocumentsStore,
  match: Match,
};

function Starred(props: Props) {
  const { t } = useTranslation();
  const { fetchStarred, starred, starredAlphabetical } = props.documents;
  const { sort } = props.match.params;

  return (
    <CenteredContent column auto>
      <PageTitle title={t("Starred")} />
      <Heading>{t("Starred")}</Heading>
      <PaginatedDocumentList
        heading={
          <Tabs>
            <Tab to="/starred" exact>
              {t("Recently Updated")}
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

      <Actions align="center" justify="flex-end">
        <Action>
          <InputSearch source="starred" />
        </Action>
        <Action>
          <NewDocumentMenu />
        </Action>
      </Actions>
    </CenteredContent>
  );
}

export default inject("documents")(observer(Starred));
