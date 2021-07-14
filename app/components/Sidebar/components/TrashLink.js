// @flow
import { observer } from "mobx-react";
import { TrashIcon } from "outline-icons";
import * as React from "react";
import { useState } from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import DocumentDelete from "scenes/DocumentDelete";
import Modal from "components/Modal";
import useStores from "../../../hooks/useStores";
import SidebarLink from "./SidebarLink";

function TrashLink({ documents }) {
  const { policies } = useStores();
  const { t } = useTranslation();
  const [showDeleteModal, setShowDeleteModal] = useState(true);
  const [document, setDocument] = useState();

  const handleModalClose = React.useCallback(() => {
    setDocument(undefined);
    setShowDeleteModal(false);
  }, []);

  const [{ isDocumentDropping }, dropToTrashDocument] = useDrop({
    accept: "document",
    drop: async (item, monitor) => {
      setDocument(documents.get(item.id));
      setShowDeleteModal(true);
    },
    canDrop: (item, monitor) => {
      console.log(policies.abilities(item.id));
      return policies.abilities(item.id).delete;
    },
    collect: (monitor) => ({
      isDocumentDropping: monitor.isOver(),
    }),
  });

  return (
    <>
      <div ref={dropToTrashDocument}>
        <SidebarLink
          to="/trash"
          icon={<TrashIcon color="currentColor" open={isDocumentDropping} />}
          exact={false}
          label={t("Trash")}
          active={documents.active ? documents.active.isDeleted : undefined}
          isActiveDrop={isDocumentDropping}
        />
      </div>
      {document && (
        <Modal
          title={t("Delete {{ documentName }}", {
            documentName: document.noun,
          })}
          onRequestClose={handleModalClose}
          isOpen={showDeleteModal}
        >
          <DocumentDelete document={document} onSubmit={handleModalClose} />
        </Modal>
      )}
    </>
  );
}

export default observer(TrashLink);
