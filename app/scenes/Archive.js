// @flow
import { observer, inject } from "mobx-react";
import * as React from "react";

import DocumentsStore from "stores/DocumentsStore";
import CenteredContent from "components/CenteredContent";
import Empty from "components/Empty";
import Heading from "components/Heading";
import PageTitle from "components/PageTitle";
import PaginatedDocumentList from "components/PaginatedDocumentList";
import Subheading from "components/Subheading";

type Props = {
  documents: DocumentsStore,
};

@observer
class Archive extends React.Component<Props> {
  render() {
    const { documents } = this.props;

    return (
      <CenteredContent column auto>
        <PageTitle title="Archive" />
        <Heading>Archive</Heading>
        <PaginatedDocumentList
          documents={documents.archived}
          fetch={documents.fetchArchived}
          heading={<Subheading>Documents</Subheading>}
          empty={<Empty>The document archive is empty at the moment.</Empty>}
          showCollection
          showTemplate
        />
      </CenteredContent>
    );
  }
}

export default inject("documents")(Archive);
