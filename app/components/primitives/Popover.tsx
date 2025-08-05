import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";
import { mergeRefs } from "react-merge-refs";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
import { fadeAndScaleIn } from "~/styles/animations";

const Popover = PopoverPrimitive.Root;

const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>((props, ref) => {
  const { children, ...rest } = props;
  return (
    <PopoverPrimitive.Trigger ref={ref} {...rest} asChild>
      {children}
    </PopoverPrimitive.Trigger>
  );
});
PopoverTrigger.displayName = PopoverPrimitive.Trigger.displayName;

type ContentProps = {
  /** The width of the popover, defaults to 380px. */
  width?: number;
  /** The minimum width of the popover, use instead of width if contents adjusts size. */
  minWidth?: number;
  /** Whether the popover should be scrollable, defaults to true. */
  scrollable?: boolean;
  /** Shrink the padding of the popover */
  shrink?: boolean;
} & React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  ContentProps
>((props, forwardedRef) => {
  const ref = React.useRef<React.ElementRef<typeof PopoverPrimitive.Content>>();

  const {
    width = 380,
    minWidth,
    scrollable = true,
    shrink = false,
    sideOffset = 4,
    children,
    ...rest
  } = props;

  const enablePointerEvents = React.useCallback(() => {
    if (ref.current) {
      ref.current.style.pointerEvents = "auto";
    }
  }, []);

  const disablePointerEvents = React.useCallback(() => {
    if (ref.current) {
      ref.current.style.pointerEvents = "none";
    }
  }, []);

  return (
    <PopoverPrimitive.Portal>
      <StyledContent
        ref={mergeRefs([ref, forwardedRef])}
        sideOffset={sideOffset}
        $width={width}
        $minWidth={minWidth}
        $scrollable={scrollable}
        $shrink={shrink}
        onAnimationStart={disablePointerEvents}
        onAnimationEnd={enablePointerEvents}
        {...rest}
      >
        {children}
      </StyledContent>
    </PopoverPrimitive.Portal>
  );
});
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

type StyledContentProps = {
  $width?: number;
  $minWidth?: number;
  $scrollable: boolean;
  $shrink: boolean;
};

const StyledContent = styled(PopoverPrimitive.Content)<StyledContentProps>`
  z-index: ${depths.modal};
  max-height: var(--radix-popover-content-available-height);
  transform-origin: var(--radix-popover-content-transform-origin);

  background: ${s("menuBackground")};
  box-shadow: ${s("menuShadow")};
  border-radius: 6px;
  outline: none;

  padding: ${({ $shrink }) => ($shrink ? "6px 0" : "12px 24px")};

  ${({ $width }) => $width && `width: ${$width}px`};
  ${({ $minWidth }) => $minWidth && `min-width: ${$minWidth}px`};

  ${({ $scrollable }) =>
    $scrollable
      ? `
      		overflow-x: hidden;
      		overflow-y: auto;
    		`
      : `
      		overflow: hidden;
    		`}

  &[data-state="open"] {
    animation: ${fadeAndScaleIn} 150ms cubic-bezier(0.08, 0.82, 0.17, 1); // ease-out-circ
  }
`;

export { Popover, PopoverAnchor, PopoverTrigger, PopoverContent };
