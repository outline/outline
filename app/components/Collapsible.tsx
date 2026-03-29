import * as RadixCollapsible from "@radix-ui/react-collapsible";
import { ExpandedIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";

interface CollapsibleProps {
  /** The label displayed on the trigger button. */
  label: React.ReactNode;
  /** The content to show/hide inside the collapsible panel. */
  children: React.ReactNode;
  /** Whether the collapsible is open by default. */
  defaultOpen?: boolean;
  /** Controlled open state. */
  open?: boolean;
  /** Callback fired when the open state changes. */
  onOpenChange?: (open: boolean) => void;
  /** Additional class name for the root element. */
  className?: string;
}

/**
 * An accessible collapsible section built on Radix UI Collapsible.
 * Renders a trigger button with a disclosure chevron and animated content panel.
 *
 * @param props - component props.
 * @returns the collapsible component.
 */
export function Collapsible({
  label,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  className,
}: CollapsibleProps) {
  return (
    <RadixCollapsible.Root
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      className={className}
    >
      <StyledTrigger>
        <StyledExpandedIcon aria-hidden="true" />
        {label}
      </StyledTrigger>
      <StyledContent>{children}</StyledContent>
    </RadixCollapsible.Root>
  );
}

const StyledExpandedIcon = styled(ExpandedIcon)`
  flex-shrink: 0;
  transition: transform 150ms ease-out;
  margin-left: -4px;
`;

const StyledTrigger = styled(RadixCollapsible.Trigger)`
  display: flex;
  align-items: center;
  background: none;
  border: none;
  padding: 0 0 8px 0;
  cursor: var(--pointer);
  color: ${s("textTertiary")};
  font-size: 14pxte

  &:hover {
    color: ${s("textSecondary")};
  }

  &[data-state="closed"] {
    ${StyledExpandedIcon} {
      transform: rotate(-90deg);
    }
  }
`;

const StyledContent = styled(RadixCollapsible.Content)`
  overflow: hidden;

  &[data-state="open"] {
    animation: slideDown 200ms ease-out;
  }

  &[data-state="closed"] {
    animation: slideUp 200ms ease-out;
  }

  @keyframes slideDown {
    from {
      height: 0;
      opacity: 0;
    }
    to {
      height: var(--radix-collapsible-content-height);
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      height: var(--radix-collapsible-content-height);
      opacity: 1;
    }
    to {
      height: 0;
      opacity: 0;
    }
  }
`;
