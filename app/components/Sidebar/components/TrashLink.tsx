import { observer } from "mobx-react";
import { TrashIcon } from "outline-icons";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import DocumentDelete from "~/scenes/DocumentDelete";
import useStores from "~/hooks/useStores";
import { trashPath } from "~/utils/routeHelpers";
import { DragObject } from "../hooks/useDragAndDrop";
import SidebarLink from "./SidebarLink";

function TrashLink() {
  const { policies, dialogs, documents } = useStores();
  const { t } = useTranslation();

  const [{ isDocumentDropping }, dropToTrashRef] = useDrop({
    accept: "document",
    drop: async (item: DragObject) => {
      const document = documents.get(item.id);
      if (!document) {
        return;
      }

      dialogs.openModal({
        title: t("Delete {{ documentName }}", {
          documentName: document?.noun,
        }),
        content: (
          <DocumentDelete
            document={document}
            onSubmit={dialogs.closeAllModals}
          />
        ),
      });
    },
    canDrop: (item) => policies.abilities(item.id).delete,
    collect: (monitor) => ({
      isDocumentDropping: monitor.isOver(),
    }),
  });

  return (
    <div ref={dropToTrashRef}>
      <SidebarLink
        to={trashPath()}
        icon={<TrashIcon open={isDocumentDropping} />}
        exact={false}
        label={t("Trash")}
        active={documents.active?.isDeleted}
        isActiveDrop={isDocumentDropping}
      />
    </div>
  );
}

export default observer(TrashLink);
