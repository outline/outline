// @flow
import { observer, inject } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

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

function Trash(props: Props) {
  const { t } = useTranslation();
  const { documents } = props;

  return (
    <CenteredContent column auto>
      <PageTitle title={t("Trash")} />
      <Heading>{t("Trash")}</Heading>
      <PaginatedDocumentList
        documents={documents.deleted}
        fetch={documents.fetchDeleted}
        heading={<Subheading>{t("Documents")}</Subheading>}
        empty={<Empty>{t("Trash is empty at the moment.")}</Empty>}
        showCollection
        showTemplate
      />
    </CenteredContent>
  );
}

export default inject("documents")(observer(Trash));
