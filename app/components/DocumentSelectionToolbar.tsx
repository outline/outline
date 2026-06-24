import { observer } from "mobx-react";
import { ArchiveIcon, CloseIcon, RestoreIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled, { css } from "styled-components";
import { depths, s } from "@shared/styles";
import type { DocumentSelection } from "~/components/DocumentSelection";
import type Document from "~/models/Document";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import { Portal } from "~/components/Portal";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";

/** A bulk action that can be performed against the current selection. */
type BulkAction = {
  /** The action passed to the documents batch endpoint. */
  method: "archive" | "delete" | "restore";
  /** The document policy ability gating the action. */
  ability: "archive" | "delete" | "restore";
  /** The accessible label for the action. */
  label: string;
  /** The icon rendered for the action. */
  icon: React.ReactNode;
  /** Whether the action is destructive and should be styled as such. */
  dangerous?: boolean;
  /** A success message shown for the given number of documents. */
  message: (count: number) => string;
};

type Props = {
  /** The selection this toolbar acts upon. */
  selection: DocumentSelection;
};

function DocumentSelectionToolbar({ selection }: Props) {
  const { t } = useTranslation();
  const { documents, policies } = useStores();
  const [isProcessing, setProcessing] = React.useState(false);

  const selectedDocuments = selection.selectedIds
    .map((id) => documents.get(id))
    .filter((document): document is Document => !!document);

  const actions: BulkAction[] = [
    {
      method: "archive",
      ability: "archive",
      label: t("Archive"),
      icon: <ArchiveIcon />,
      message: (count) => t("{{ count }} document archived", { count }),
    },
    {
      method: "restore",
      ability: "restore",
      label: t("Restore"),
      icon: <RestoreIcon />,
      message: (count) => t("{{ count }} document restored", { count }),
    },
    {
      method: "delete",
      ability: "delete",
      label: t("Delete"),
      icon: <TrashIcon />,
      dangerous: true,
      message: (count) => t("{{ count }} document moved to trash", { count }),
    },
  ];

  const canPerform = (ability: BulkAction["ability"]) =>
    selectedDocuments.length > 0 &&
    selectedDocuments.every(
      (document) => policies.abilities(document.id)[ability]
    );

  const handleAction = async (action: BulkAction) => {
    const targets = selectedDocuments;
    if (!targets.length) {
      return;
    }

    setProcessing(true);
    try {
      const { succeeded, failed } = await documents.batch(
        action.method,
        targets
      );
      selection.clear();

      if (succeeded > 0) {
        toast.success(action.message(succeeded));
      }
      if (failed > 0) {
        toast.error(
          t("{{ count }} document could not be updated", { count: failed })
        );
      }
    } catch (_err) {
      toast.error(t("Could not complete the action, please try again"));
    } finally {
      setProcessing(false);
    }
  };

  const availableActions = actions.filter((action) =>
    canPerform(action.ability)
  );

  return (
    <Portal>
      <Wrapper $active={selection.isActive} aria-hidden={!selection.isActive}>
        <Background align="center" gap={4}>
          <Count type="secondary" size="small">
            {t("{{ count }} selected", { count: selection.size })}
          </Count>
          {availableActions.length > 0 && (
            <>
              <Divider />
              {availableActions.map((action) => (
                <Tooltip key={action.method} content={action.label}>
                  <Action
                    aria-label={action.label}
                    disabled={isProcessing}
                    $dangerous={action.dangerous}
                    onClick={() => handleAction(action)}
                  >
                    {action.icon}
                  </Action>
                </Tooltip>
              ))}
            </>
          )}
          <Divider />
          <Tooltip content={t("Clear selection")}>
            <Action
              aria-label={t("Clear selection")}
              disabled={isProcessing}
              onClick={selection.clear}
            >
              <CloseIcon />
            </Action>
          </Tooltip>
        </Background>
      </Wrapper>
    </Portal>
  );
}

const Wrapper = styled.div<{ $active: boolean }>`
  position: fixed;
  bottom: 24px;
  left: 50%;
  z-index: ${depths.editorToolbar};
  transform: translate(-50%, 16px) scale(0.96);
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275),
    transform 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275);

  ${({ $active }) =>
    $active &&
    css`
      transform: translate(-50%, 0) scale(1);
      opacity: 1;
      pointer-events: auto;
    `}

  @media print {
    display: none;
  }
`;

const Background = styled(Flex)`
  background-color: ${s("menuBackground")};
  box-shadow: ${s("menuShadow")};
  border-radius: 8px;
  height: 40px;
  padding: 0 8px;
`;

const Count = styled(Text)`
  margin: 0 4px;
  white-space: nowrap;
`;

const Divider = styled.div`
  width: 1px;
  height: 20px;
  background: ${s("divider")};
  flex-shrink: 0;
`;

const Action = styled(NudeButton)<{ $dangerous?: boolean }>`
  width: 28px;
  height: 28px;
  color: ${s("textSecondary")};

  &:hover:enabled,
  &[aria-expanded="true"] {
    background: ${s("sidebarControlHoverBackground")};
    color: ${(props) =>
      props.$dangerous ? props.theme.danger : props.theme.text};
  }

  &:disabled {
    opacity: 0.5;
  }
`;

export default observer(DocumentSelectionToolbar);
