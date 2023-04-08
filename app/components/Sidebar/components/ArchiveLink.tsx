import { observer } from "mobx-react";
import { ArchiveIcon } from "outline-icons";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import { archivePath } from "~/utils/routeHelpers";
import SidebarLink, { DragObject } from "./SidebarLink";

function ArchiveLink() {
  const { policies, documents } = useStores();
  const { t } = useTranslation();
  const { showToast } = useToasts();

  const [{ isDocumentDropping }, dropToArchiveDocument] = useDrop({
    accept: "document",
    drop: async (item: DragObject) => {
      const document = documents.get(item.id);
      await document?.archive();
      showToast(t("Document archived"), {
        type: "success",
      });
    },
    canDrop: (item) => policies.abilities(item.id).archive,
    collect: (monitor) => ({
      isDocumentDropping: monitor.isOver(),
    }),
  });

  return (
    <div ref={dropToArchiveDocument}>
      <SidebarLink
        to={archivePath()}
        icon={<ArchiveIcon open={isDocumentDropping} />}
        exact={false}
        label={t("Archive")}
        active={documents.active?.isArchived && !documents.active?.isDeleted}
        isActiveDrop={isDocumentDropping}
      />
    </div>
  );
}

export default observer(ArchiveLink);
