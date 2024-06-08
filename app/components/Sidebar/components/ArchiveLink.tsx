import { observer } from "mobx-react";
import { ArchiveIcon } from "outline-icons";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useStores from "~/hooks/useStores";
import { archivePath } from "~/utils/routeHelpers";
import SidebarLink, { DragObject } from "./SidebarLink";

function ArchiveLink() {
  const { policies, documents } = useStores();
  const { t } = useTranslation();

  const [{ isDocumentDropping }, dropToArchiveDocument] = useDrop({
    accept: "document",
    drop: async (item: DragObject) => {
      const document = documents.get(item.id);
      await document?.archive();
      toast.success(t("Document archived"));
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
