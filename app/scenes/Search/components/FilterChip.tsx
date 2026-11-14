import { CloseIcon, DisclosureIcon } from "outline-icons";
import styled from "styled-components";
import { s } from "@shared/styles";
import { breakpoint } from "@shared/styles/breakpoint";
import NudeButton from "~/components/NudeButton";
import Text from "~/components/Text";
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
      <ChipLabel type={value ? "secondary" : undefined}>{label}</ChipLabel>
      {value && (
        <ChipValue weight="bold" ellipsis>
          {value}
        </ChipValue>
      )}
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
  align-items: stretch;
  max-width: 100%;
  height: 28px;
  border: 1px solid ${s("buttonNeutralBorder")};
  border-radius: 8px;
  overflow: hidden;
  user-select: none;
  font-size: 13px;
  font-weight: 450;
  color: ${s("text")};

  &:has(:focus-visible) {
    border-color: ${s("inputBorderFocused")};
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
  gap: 5px;
  min-width: 0;
  height: 100%;
  padding: 0 4px 0 7px;
  margin: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: var(--pointer);
  transition: background 100ms ease-out;

  &:hover,
  &[aria-expanded="true"] {
    background: ${s("buttonNeutralHoverBackground")};
  }

  &:focus-visible {
    outline: none;
  }
`;

/** A part of a chip that only shows content, for filters without options. */
export const ChipStatic = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  padding: 0 6px 0 7px;
`;

const ChipIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-inline-start: -2px;
  color: ${s("textTertiary")};

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ChipLabel = styled(Text)`
  flex-shrink: 0;
  white-space: nowrap;
`;

const ChipValue = styled(Text)`
  max-width: 240px;
  margin-inline-start: -2px;
`;

const RemoveButton = styled(NudeButton)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 26px;
  height: auto;
  border-radius: 0;
  border-inline-start: 1px solid ${s("buttonNeutralBorder")};
  color: ${s("textTertiary")};
  transition: background 100ms ease-out;

  &:hover,
  &:focus-visible {
    color: ${s("text")};
    background: ${s("buttonNeutralHoverBackground")};
  }

  &:focus-visible {
    outline: none;
  }

  ${breakpoint("mobile", "tablet")`
    width: 34px;
  `};
`;

const Disclosure = styled(DisclosureIcon)`
  flex-shrink: 0;
  margin-inline-start: -3px;
  color: ${s("textTertiary")};
`;
