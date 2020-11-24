// @flow
import { observer, inject } from "mobx-react";
import * as React from "react";
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

@observer
class Starred extends React.Component<Props> {
  render() {
    const { fetchStarred, starred, starredAlphabetical } = this.props.documents;
    const { sort } = this.props.match.params;

    return (
      <CenteredContent column auto>
        <PageTitle title="Starred" />
        <Heading>Starred</Heading>
        <PaginatedDocumentList
          heading={
            <Tabs>
              <Tab to="/starred" exact>
                Recently Updated
              </Tab>
              <Tab to="/starred/alphabetical" exact>
                Alphabetical
              </Tab>
            </Tabs>
          }
          empty={<Empty>You’ve not starred any documents yet.</Empty>}
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
}

export default inject("documents")(Starred);
