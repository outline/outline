import { PadlockIcon } from "outline-icons";
import type * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { useTheme } from "styled-components";
import { UnlockedPadlockIcon } from "~/components/Icons/UnlockedPadlockIcon";
import ToolbarButton from "./ToolbarButton";

interface Props extends React.ComponentProps<typeof ToolbarButton> {
  /** Whether the aspect ratio is locked. */
  isLocked: boolean;
}

/**
 * A toolbar button that shows and toggles whether media keeps its aspect ratio.
 *
 * @param props - the component props.
 * @returns the button.
 */
export function AspectRatioLockButton({ isLocked, ...rest }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <LockButton
      aria-label={t("Lock aspect ratio")}
      aria-pressed={isLocked}
      {...rest}
    >
      {isLocked ? (
        <PadlockIcon size={18} />
      ) : (
        <UnlockedPadlockIcon size={18} color={theme.textTertiary} />
      )}
    </LockButton>
  );
}

const LockButton = styled(ToolbarButton)`
  justify-content: center;
  margin-left: -6px;

  /* The padlock glyph sits above its box center, so align it with the digits. */
  svg {
    transform: translateY(1px);
  }
`;
