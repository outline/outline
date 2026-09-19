import { observer } from "mobx-react";
import type * as React from "react";
import { useTranslation } from "react-i18next";
import type Document from "~/models/Document";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { useDocumentActiveModels } from "~/hooks/useDocumentActiveModels";
import { useDocumentMenuAction } from "~/hooks/useDocumentMenuAction";

type Props = {
  /** Document for which the menu is to be shown */
  document: Document;
  /** The element that opens the menu when right clicked */
  children: React.ReactNode;
  /** Invoked when menu is opened */
  onOpen?: () => void;
  /** Invoked when menu is closed */
  onClose?: () => void;
};

/**
 * Wraps its children in a right click context menu offering the standard
 * document actions.
 */
export const DocumentContextMenu = observer(function DocumentContextMenu_({
  document,
  children,
  onOpen,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const action = useDocumentMenuAction({ documentId: document.id });
  const activeModels = useDocumentActiveModels(document);

  return (
    <ActionContextProvider value={{ activeModels }}>
      <ContextMenu
        action={action}
        ariaLabel={t("Document options")}
        onOpen={onOpen}
        onClose={onClose}
      >
        {children}
      </ContextMenu>
    </ActionContextProvider>
  );
});
