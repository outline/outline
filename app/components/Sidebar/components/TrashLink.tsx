import { observer } from "mobx-react";
import { TrashIcon } from "outline-icons";
import * as React from "react";
import { useState } from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import Document from "~/models/Document";
import DocumentDelete from "~/scenes/DocumentDelete";
import Modal from "~/components/Modal";
import useStores from "~/hooks/useStores";
import { trashPath } from "~/utils/routeHelpers";
import SidebarLink, { DragObject } from "./SidebarLink";

function TrashLink() {
  const { policies, documents } = useStores();
  const { t } = useTranslation();
  const [document, setDocument] = useState<Document>();

  const [{ isDocumentDropping }, dropToTrashDocument] = useDrop({
    accept: "document",
    drop: (item: DragObject) => {
      const doc = documents.get(item.id);

      // without setTimeout it was not working in firefox v89.0.2-ubuntu
      // on dropping mouseup is considered as clicking outside the modal, and it immediately closes
      setTimeout(() => doc && setDocument(doc), 1);
    },
    canDrop: (item) => policies.abilities(item.id).delete,
    collect: (monitor) => ({
      isDocumentDropping: monitor.isOver(),
    }),
  });

  return (
    <>
      <div ref={dropToTrashDocument}>
        <SidebarLink
          to={trashPath()}
          icon={<TrashIcon open={isDocumentDropping} />}
          exact={false}
          label={t("Trash")}
          active={documents.active?.isDeleted}
          isActiveDrop={isDocumentDropping}
        />
      </div>
      {document && (
        <Modal
          title={t("Delete {{ documentName }}", {
            documentName: document.noun,
          })}
          onRequestClose={() => setDocument(undefined)}
          isOpen
        >
          <DocumentDelete
            document={document}
            onSubmit={() => setDocument(undefined)}
          />
        </Modal>
      )}
    </>
  );
}

export default observer(TrashLink);
