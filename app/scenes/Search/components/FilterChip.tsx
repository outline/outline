import { CloseIcon, DisclosureIcon } from "outline-icons";
import styled from "styled-components";
import { ellipsis, s } from "@shared/styles";
import { breakpoint } from "@shared/styles/breakpoint";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";

interface ChipContentProps {
  /** Icon shown before the label. */
  icon?: React.ReactNode;
  /** Name of the filter. */
  label: string;
  /** The selected value, omitted when there is no value. */
  value?: string;
  /** Whether to show a disclosure arrow after the content. */
  disclosure?: boolean;
}

/**
 * The icon, filter name and selected value shown inside a filter chip.
 *
 * @param props the content props.
 * @returns the chip content.
 */
export function ChipContent({
  icon,
  label,
  value,
  disclosure,
}: ChipContentProps) {
  return (
    <>
      {icon && <ChipIcon aria-hidden>{icon}</ChipIcon>}
      <ChipLabel $muted={!!value}>{label}</ChipLabel>
      {value && <ChipValue>{value}</ChipValue>}
      {disclosure && <Disclosure size={20} aria-hidden />}
    </>
  );
}

interface ChipRemoveButtonProps {
  /** Accessible label and tooltip for the button. */
  label: string;
  /** Callback when the button is clicked. */
  onClick: () => void;
}

/**
 * A button at the end of a filter chip that removes the filter.
 *
 * @param props the button props.
 * @returns the remove button.
 */
export function ChipRemoveButton({ label, onClick }: ChipRemoveButtonProps) {
  return (
    <Tooltip content={label}>
      <RemoveButton aria-label={label} onClick={onClick}>
        <CloseIcon size={18} />
      </RemoveButton>
    </Tooltip>
  );
}

/** Outlined container for a filter chip. */
export const Chip = styled.div`
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  height: 32px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: ${s("text")};
  box-shadow: inset 0 0 0 1px ${s("buttonNeutralBorder")};
  transition: background 100ms ease-out;

  &:hover,
  &:has([aria-expanded="true"]) {
    background: ${s("buttonNeutralHoverBackground")};
  }

  &:has(:focus-visible) {
    box-shadow: inset 0 0 0 1px ${s("inputBorderFocused")};
  }

  ${breakpoint("mobile", "tablet")`
    height: 36px;
    font-size: 15px;
  `};
`;

/** The button inside a chip that opens the options of the filter. */
export const ChipButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  height: 100%;
  padding: 0 6px 0 10px;
  margin: 0;
  border: 0;
  border-radius: inherit;
  background: none;
  color: inherit;
  font: inherit;
  cursor: var(--pointer);

  &:focus-visible {
    outline: none;
  }
`;

/** A part of a chip that only shows content, for filters without options. */
export const ChipStatic = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 0 6px 0 10px;
`;

const ChipIcon = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  margin: 0 -2px 0 -4px;
  color: ${s("textSecondary")};
`;

const ChipLabel = styled.span<{ $muted: boolean }>`
  flex-shrink: 0;
  white-space: nowrap;
  color: ${(props) =>
    props.$muted ? props.theme.textSecondary : props.theme.text};
`;

const ChipValue = styled.span`
  ${ellipsis()}
  max-width: 240px;
  margin-inline-start: -2px;
`;

const RemoveButton = styled(NudeButton)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: auto;
  height: 100%;
  padding: 0 6px;
  border-start-start-radius: 0;
  border-end-start-radius: 0;
  border-start-end-radius: inherit;
  border-end-end-radius: inherit;
  border-inline-start: 1px solid ${s("buttonNeutralBorder")};
  color: ${s("textTertiary")};

  &:hover,
  &:focus-visible {
    color: ${s("text")};
  }
`;

const Disclosure = styled(DisclosureIcon)`
  flex-shrink: 0;
  margin-inline-start: -4px;
  color: ${s("textSecondary")};
`;
