import { observer } from "mobx-react";
import { TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import Scene from "~/components/Scene";
import Subheading from "~/components/Subheading";
import { permanentlyDeleteDocumentsInTrash } from "~/actions/definitions/documents";
import useActionContext from "~/hooks/useActionContext";
import useStores from "~/hooks/useStores";

function Trash() {
  const { t } = useTranslation();
  const { documents } = useStores();
  const context = useActionContext();
  return (
    <Scene
      icon={<TrashIcon />}
      title={t("Trash")}
      actions={
        documents.deleted.length > 0 && (
          <Button
            neutral
            action={permanentlyDeleteDocumentsInTrash}
            context={context}
          >
            {t("Empty trash")}
          </Button>
        )
      }
    >
      <Heading>{t("Trash")}</Heading>
      <PaginatedDocumentList
        documents={documents.deleted}
        fetch={documents.fetchDeleted}
        heading={<Subheading sticky>{t("Recently deleted")}</Subheading>}
        empty={<Empty>{t("Trash is empty at the moment.")}</Empty>}
        showCollection
        showTemplate
      />
    </Scene>
  );
}

export default observer(Trash);
