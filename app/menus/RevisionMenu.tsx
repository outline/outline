import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import Document from "~/models/Document";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";
import { actionToMenuItem } from "~/actions";
import {
  copyLinkToRevision,
  restoreRevision,
} from "~/actions/definitions/revisions";
import useActionContext from "~/hooks/useActionContext";
import separator from "./separator";

type Props = {
  document: Document;
  revisionId: string;
  className?: string;
};

function RevisionMenu({ document, className }: Props) {
  const menu = useMenuState({
    modal: true,
  });
  const { t } = useTranslation();
  const context = useActionContext({
    activeDocumentId: document.id,
  });

  return (
    <>
      <OverflowMenuButton
        className={className}
        aria-label={t("Show menu")}
        {...menu}
      />
      <ContextMenu {...menu} aria-label={t("Revision options")}>
        <Template
          {...menu}
          items={[
            actionToMenuItem(restoreRevision, context),
            separator(),
            actionToMenuItem(copyLinkToRevision, context),
          ]}
        />
      </ContextMenu>
    </>
  );
}

export default observer(RevisionMenu);
