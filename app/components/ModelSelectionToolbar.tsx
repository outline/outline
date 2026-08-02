import { observer } from "mobx-react";
import { CloseIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import { depths, s } from "@shared/styles";
import type { ModelSelection } from "~/components/ModelSelection";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import { Portal } from "~/components/Portal";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";

/** A bulk action that can be performed against the current selection. */
export type ModelSelectionAction = {
  /** A stable key identifying the action. */
  key: string;
  /** The accessible label for the action. */
  label: string;
  /** The icon rendered for the action. */
  icon: React.ReactNode;
  /** Whether the action is destructive and should be styled as such. */
  dangerous?: boolean;
  /** Whether the action applies to the current selection. */
  visible: boolean;
  /** Perform the action against the current selection. */
  perform: () => Promise<void>;
};

type Props = {
  /** The selection this toolbar acts upon. */
  selection: ModelSelection;
  /** The actions available for the current selection. */
  actions: ModelSelectionAction[];
};

function ModelSelectionToolbar({ selection, actions }: Props) {
  const { t } = useTranslation();
  const [isProcessing, setProcessing] = React.useState(false);
  const [isWorking, setWorking] = React.useState(false);

  // Snapshot the count and available actions while the selection is active and
  // hold them through the exit animation, so the toolbar does not shrink or
  // flash an empty state as it animates away after being cleared.
  const snapshot = React.useRef({
    size: selection.size,
    actions: [] as ModelSelectionAction[],
  });
  if (selection.isActive) {
    snapshot.current = {
      size: selection.size,
      actions: actions.filter((action) => action.visible),
    };
  }
  const { size: displaySize, actions: visibleActions } = snapshot.current;

  const handlePerform = async (action: ModelSelectionAction) => {
    setProcessing(true);
    // Only surface a "Working…" state if the action is slow, to avoid a flash
    // on quick operations.
    const workingTimer = setTimeout(() => setWorking(true), 1000);
    try {
      await action.perform();
    } finally {
      clearTimeout(workingTimer);
      setWorking(false);
      setProcessing(false);
    }
  };

  return (
    <Portal>
      <Wrapper $active={selection.isActive} aria-hidden={!selection.isActive}>
        <Background align="center" gap={4}>
          <Count type="secondary" size="small">
            {isWorking
              ? t("Working…")
              : t("{{ count }} selected", { count: displaySize })}
          </Count>
          {visibleActions.length > 0 && (
            <>
              <Divider />
              {visibleActions.map((action) => (
                <Tooltip key={action.key} content={action.label}>
                  <Action
                    aria-label={action.label}
                    disabled={isProcessing}
                    $dangerous={action.dangerous}
                    onClick={() => handlePerform(action)}
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
  font-weight: 500;
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

export default observer(ModelSelectionToolbar);
