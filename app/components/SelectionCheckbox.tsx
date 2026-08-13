import { CheckmarkIcon } from "outline-icons";
import * as React from "react";
import styled, { css } from "styled-components";
import { hover, s } from "@shared/styles";
import NudeButton from "~/components/NudeButton";

type Props = {
  /** Whether the item, or every item in the list, is selected. */
  checked: boolean;
  /** Whether only some of the items in the list are selected. */
  indeterminate?: boolean;
  /** The accessible label for the checkbox. */
  label: string;
  /** Called when the checkbox is clicked, the event carries any modifier keys. */
  onClick: (event: React.MouseEvent) => void;
  className?: string;
};

/**
 * A checkbox used to add an item, or every item in a list, to a multi-selection.
 * It is positioned absolutely, vertically centered within the nearest
 * positioned ancestor.
 *
 * @param props The component props.
 * @returns the checkbox element.
 */
export function SelectionCheckbox({
  checked,
  indeterminate,
  label,
  onClick,
  className,
}: Props) {
  // Suppress the browser's text selection when shift-clicking a range.
  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.shiftKey) {
      event.preventDefault();
    }
  };

  return (
    <Checkbox
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      className={className}
      $checked={checked || !!indeterminate}
      onClick={onClick}
      onMouseDown={handleMouseDown}
    >
      {checked ? <CheckmarkIcon size={16} /> : indeterminate ? <Dash /> : null}
    </Checkbox>
  );
}

const Checkbox = styled(NudeButton)<{ $checked: boolean }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: 2px solid ${s("inputBorder")};
  color: ${(props) => props.theme.accentText};
  opacity: 0.75;
  transition:
    opacity 100ms ease,
    background 100ms ease,
    border-color 100ms ease;

  &: ${hover} {
    opacity: 1;
  }

  ${(props) =>
    props.$checked &&
    css`
      background: ${props.theme.accent};
      border-color: ${props.theme.accent};
      opacity: 1;
    `}
`;

const Dash = styled.span`
  width: 8px;
  height: 2px;
  border-radius: 1px;
  background: currentColor;
`;
