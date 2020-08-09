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
class Trash extends React.Component<Props> {
  render() {
    const { documents } = this.props;

    return (
      <CenteredContent column auto>
        <PageTitle title="Trash" />
        <Heading>Trash</Heading>
        <PaginatedDocumentList
          documents={documents.deleted}
          fetch={documents.fetchDeleted}
          heading={<Subheading>Documents</Subheading>}
          empty={<Empty>Trash is empty at the moment.</Empty>}
          showCollection
          showTemplate
        />
      </CenteredContent>
    );
  }
}

export default inject("documents")(Trash);
