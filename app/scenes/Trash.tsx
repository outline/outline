import { observer } from "mobx-react";
import { TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import Scene from "~/components/Scene";
import Subheading from "~/components/Subheading";
import useStores from "~/hooks/useStores";

function Trash() {
  const { t } = useTranslation();
  const { documents } = useStores();
  return (
    <Scene icon={<TrashIcon />} title={t("Trash")}>
      <Heading>{t("Trash")}</Heading>
      <PaginatedDocumentList
        documents={documents.deleted}
        fetch={documents.fetchDeleted}
        heading={<Subheading sticky>{t("Documents")}</Subheading>}
        empty={<Empty>{t("Trash is empty at the moment.")}</Empty>}
        showCollection
        showTemplate
      />
    </Scene>
  );
}

export default observer(Trash);
