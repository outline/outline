// @flow
import { observer } from "mobx-react";
import { ArchiveIcon } from "outline-icons";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import useStores from "../../../hooks/useStores";
import SidebarLink from "./SidebarLink";

function ArchiveLink({ documents }) {
  const { policies, ui } = useStores();
  const { t } = useTranslation();

  const [{ isDocumentDropping }, dropToArchiveDocument] = useDrop({
    accept: "document",
    drop: async (item, monitor) => {
      const document = documents.get(item.id);
      await document.archive();
      ui.showToast(t("Document archived"), { type: "success" });
    },
    canDrop: (item, monitor) => policies.abilities(item.id).archive,
    collect: (monitor) => ({
      isDocumentDropping: monitor.isOver(),
    }),
  });

  return (
    <div ref={dropToArchiveDocument}>
      <SidebarLink
        to="/archive"
        icon={<ArchiveIcon color="currentColor" open={isDocumentDropping} />}
        exact={false}
        label={t("Archive")}
        active={documents.active?.isArchived && !documents.active?.isDeleted}
        isActiveDrop={isDocumentDropping}
      />
    </div>
  );
}

export default observer(ArchiveLink);
