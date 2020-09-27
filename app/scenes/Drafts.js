// @flow
import { observer, inject } from "mobx-react";
import * as React from "react";

import DocumentsStore from "stores/DocumentsStore";
import Actions, { Action } from "components/Actions";
import CenteredContent from "components/CenteredContent";
import Empty from "components/Empty";
import Heading from "components/Heading";
import InputSearch from "components/InputSearch";
import PageTitle from "components/PageTitle";
import PaginatedDocumentList from "components/PaginatedDocumentList";
import Subheading from "components/Subheading";
import NewDocumentMenu from "menus/NewDocumentMenu";

type Props = {
  documents: DocumentsStore,
};

@observer
class Drafts extends React.Component<Props> {
  render() {
    const { fetchDrafts, drafts } = this.props.documents;

    return (
      <CenteredContent column auto>
        <PageTitle title="Drafts" />
        <Heading>Drafts</Heading>
        <PaginatedDocumentList
          heading={<Subheading>Documents</Subheading>}
          empty={<Empty>You’ve not got any drafts at the moment.</Empty>}
          fetch={fetchDrafts}
          documents={drafts}
          showDraft={false}
          showCollection
        />

        <Actions align="center" justify="flex-end">
          <Action>
            <InputSearch source="drafts" />
          </Action>
          <Action>
            <NewDocumentMenu />
          </Action>
        </Actions>
      </CenteredContent>
    );
  }
}

export default inject("documents")(Drafts);
