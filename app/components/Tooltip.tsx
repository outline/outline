import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { transparentize } from "polished";
import * as React from "react";
import styled, { createGlobalStyle, keyframes } from "styled-components";
import { s } from "@shared/styles";
import useMobile from "~/hooks/useMobile";
import { useTooltipContext } from "./TooltipContext";

export type Props = {
  /** The content to display in the tooltip. */
  content?: React.ReactChild | React.ReactChild[];
  /** A keyboard shortcut to display next to the content */
  shortcut?: React.ReactNode;
  /** Whether to show the shortcut on a new line */
  shortcutOnNewline?: boolean;
  /** The preferred side of the trigger to render against when open */
  side?: "top" | "right" | "bottom" | "left";
  /** The distance in pixels from the trigger */
  sideOffset?: number;
  /** The preferred alignment against the trigger */
  align?: "start" | "center" | "end";
  /** An offset in pixels from the "start" or "end" alignment options */
  alignOffset?: number;
  /** When true, overrides the side and align preferences to prevent collisions with boundary edges */
  avoidCollisions?: boolean;
  /** The element used as the collision boundary */
  collisionBoundary?: Element | null | Array<Element | null>;
  /** The distance in pixels from the boundary edges where collision detection should occur */
  collisionPadding?:
    | number
    | Partial<Record<"top" | "right" | "bottom" | "left", number>>;
  /** Whether the tooltip should be open by default */
  defaultOpen?: boolean;
  /** The controlled open state of the tooltip */
  open?: boolean;
  /** Event handler called when the open state of the tooltip changes */
  onOpenChange?: (open: boolean) => void;
  /** The duration from when the mouse enters the trigger until the tooltip gets opened */
  delayDuration?: number;
  /** How much time a user has to enter another trigger without incurring a delay again */
  skipDelayDuration?: number;
  /** Prevents the tooltip from opening */
  disableHoverableContent?: boolean;
  /** The children that will trigger the tooltip */
  children?: React.ReactNode;
  /** Whether to disable the tooltip entirely */
  disabled?: boolean;
  /** Custom offset for the tooltip */
  offset?: [number, number];
  /** Placement prop for backward compatibility with Tippy */
  placement?:
    | "top"
    | "right"
    | "bottom"
    | "left"
    | "top-start"
    | "top-end"
    | "right-start"
    | "right-end"
    | "bottom-start"
    | "bottom-end"
    | "left-start"
    | "left-end";
  /** Delay prop for backward compatibility with Tippy */
  delay?: number | [number, number];
};

/**
 * Tooltip component using Radix UI primitives.
 * Displays a tooltip with optional keyboard shortcut.
 * Optionally displays a keyboard shortcut next to the content.
 *
 * Wrap this component in a TooltipProvider to allow multiple tooltips to share the same
 * provider instance (delay, animation, etc).
 */
function Tooltip({
  shortcut,
  shortcutOnNewline,
  content: tooltip,
  side = "top",
  sideOffset = 8,
  align = "center",
  alignOffset = 0,
  avoidCollisions = true,
  collisionBoundary,
  collisionPadding = 8,
  defaultOpen,
  open,
  onOpenChange,
  delayDuration = 500,
  skipDelayDuration = 300,
  disableHoverableContent = false,
  children,
  disabled = false,
  offset,
  placement,
  delay,
  ...rest
}: Props): React.ReactElement | null {
  const isMobile = useMobile();
  const isInProvider = useTooltipContext();

  // Handle backward compatibility with Tippy props
  let finalSide = side;
  let finalAlign = align;
  let finalDelayDuration = delayDuration;
  let finalSideOffset = sideOffset;

  // Convert placement prop to side/align for backward compatibility
  if (placement) {
    const [placementSide, placementAlign] = placement.split("-");
    finalSide = placementSide as "top" | "right" | "bottom" | "left";
    if (placementAlign) {
      finalAlign = placementAlign as "start" | "center" | "end";
    }
  }

  // Handle delay prop for backward compatibility
  if (delay !== undefined) {
    if (typeof delay === "number") {
      finalDelayDuration = delay;
    } else if (Array.isArray(delay)) {
      finalDelayDuration = delay[0];
    }
  }

  // Handle offset prop for backward compatibility
  if (offset) {
    finalSideOffset = offset[1] || sideOffset;
  }

  let content = <>{tooltip}</>;

  if (!tooltip || isMobile || disabled) {
    return (children as React.ReactElement) ?? null;
  }

  if (shortcut) {
    content = (
      <>
        {tooltip}
        {shortcutOnNewline ? <br /> : " "}
        {typeof shortcut === "string" ? (
          shortcut
            .split("+")
            .map((key, i) => (
              <Shortcut key={`${key}${i}`}>
                {key.length === 1 ? key.toUpperCase() : key}
              </Shortcut>
            ))
        ) : (
          <Shortcut>{shortcut}</Shortcut>
        )}
      </>
    );
  }

  const tooltipContent = (
    <TooltipPrimitive.Root
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      delayDuration={isInProvider ? undefined : finalDelayDuration}
      disableHoverableContent={disableHoverableContent}
    >
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <StyledContent
          side={finalSide}
          sideOffset={finalSideOffset}
          align={finalAlign}
          alignOffset={alignOffset}
          avoidCollisions={avoidCollisions}
          collisionBoundary={collisionBoundary}
          collisionPadding={collisionPadding}
          {...rest}
        >
          {content}
        </StyledContent>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );

  // If we're already in a provider, don't wrap with another one
  if (isInProvider) {
    return tooltipContent;
  }

  // Otherwise, wrap with a provider for standalone usage
  return (
    <TooltipPrimitive.Provider
      delayDuration={finalDelayDuration}
      skipDelayDuration={skipDelayDuration}
    >
      {tooltipContent}
    </TooltipPrimitive.Provider>
  );
}

const slideUpAndFade = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideRightAndFade = keyframes`
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const slideDownAndFade = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideLeftAndFade = keyframes`
  from {
    opacity: 0;
    transform: translateX(8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const Shortcut = styled.kbd`
  position: relative;
  top: -1px;

  margin-left: 2px;
  display: inline-block;
  padding: 2px 4px;
  font-size: 12px;
  font-family: ${s("fontFamilyMono")};
  line-height: 10px;
  color: ${s("tooltipText")};
  border: 1px solid ${(props) => transparentize(0.75, props.theme.tooltipText)};
  vertical-align: middle;
  border-radius: 3px;
`;

const StyledContent = styled(TooltipPrimitive.Content)`
  position: relative;
  background-color: ${s("tooltipBackground")};
  color: ${s("tooltipText")};
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.4;
  white-space: normal;
  outline: 0;
  padding: 5px 9px;
  z-index: 9999;
  max-width: calc(100vw - 10px);

  /* Animation */
  &[data-state="delayed-open"][data-side="top"] {
    animation: ${slideUpAndFade} 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  &[data-state="delayed-open"][data-side="right"] {
    animation: ${slideLeftAndFade} 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  &[data-state="delayed-open"][data-side="bottom"] {
    animation: ${slideDownAndFade} 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  &[data-state="delayed-open"][data-side="left"] {
    animation: ${slideRightAndFade} 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

export const TooltipStyles = createGlobalStyle`
  /* Legacy styles for backward compatibility - can be removed after migration */
`;

export default Tooltip;
