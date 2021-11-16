import { observer } from "mobx-react";
import { ArchiveIcon } from "outline-icons";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import SidebarLink from "./SidebarLink";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/routeHelpers' or its cor... Remove this comment to see the full error message
import { archivePath } from "utils/routeHelpers";

// @ts-expect-error ts-migrate(7031) FIXME: Binding element 'documents' implicitly has an 'any... Remove this comment to see the full error message
function ArchiveLink({ documents }) {
  const { policies } = useStores();
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const [{ isDocumentDropping }, dropToArchiveDocument] = useDrop({
    accept: "document",
    drop: async (item, monitor) => {
      // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
      const document = documents.get(item.id);
      await document.archive();
      showToast(t("Document archived"), {
        type: "success",
      });
    },
    // @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
    canDrop: (item, monitor) => policies.abilities(item.id).archive,
    collect: (monitor) => ({
      isDocumentDropping: monitor.isOver(),
    }),
  });
  return (
    <div ref={dropToArchiveDocument}>
      <SidebarLink
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ to: any; icon: Element; exact: boolean; la... Remove this comment to see the full error message
        to={archivePath()}
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
