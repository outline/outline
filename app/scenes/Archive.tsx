import { observer } from "mobx-react";
import { ArchiveIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import Scene from "~/components/Scene";
import Subheading from "~/components/Subheading";
import useStores from "~/hooks/useStores";

function Archive() {
  const { t } = useTranslation();
  const { documents } = useStores();
  return (
    <Scene icon={<ArchiveIcon />} title={t("Archive")}>
      <Heading>{t("Archive")}</Heading>
      <PaginatedDocumentList
        documents={documents.archived}
        fetch={documents.fetchArchived}
        heading={<Subheading sticky>{t("Documents")}</Subheading>}
        empty={
          <Empty>{t("The document archive is empty at the moment.")}</Empty>
        }
        showCollection
        showTemplate
      />
    </Scene>
  );
}

export default observer(Archive);
