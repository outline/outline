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

function Archive(props: Props) {
  const { t } = useTranslation();
  const { documents } = props;

  return (
    <CenteredContent column auto>
      <PageTitle title={t("Archive")} />
      <Heading>{t("Archive")}</Heading>
      <PaginatedDocumentList
        documents={documents.archived}
        fetch={documents.fetchArchived}
        heading={<Subheading>{t("Documents")}</Subheading>}
        empty={
          <Empty>{t("The document archive is empty at the moment.")}</Empty>
        }
        showCollection
        showTemplate
      />
    </CenteredContent>
  );
}

export default inject("documents")(observer(Archive));
