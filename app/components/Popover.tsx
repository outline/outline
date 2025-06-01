import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import useKeyDown from "~/hooks/useKeyDown";
import useMobile from "~/hooks/useMobile";
import { fadeAndScaleIn } from "~/styles/animations";

type Props = {
  children: React.ReactNode;
  /** Whether the popover is visible */
  visible?: boolean;
  /** The width of the popover, defaults to 380px. */
  width?: number;
  /** The minimum width of the popover, use instead of width if contents adjusts size. */
  minWidth?: number;
  /** Shrink the padding of the popover */
  shrink?: boolean;
  /** Make the popover flex */
  flex?: boolean;
  /** The tab index of the popover */
  tabIndex?: number;
  /** Whether the popover should be scrollable, defaults to true. */
  scrollable?: boolean;
  /** The position of the popover on mobile, defaults to "top". */
  mobilePosition?: "top" | "bottom";
  /** Function to show the popover */
  show?: () => void;
  /** Function to hide the popover */
  hide?: () => void;
  /** Whether to hide on escape key, defaults to true */
  hideOnEsc?: boolean;
  /** Whether to hide on click outside, defaults to true */
  hideOnClickOutside?: boolean;
  /** Aria label for accessibility */
  "aria-label"?: string;
  /** Placement for the popover */
  placement?: string;
  /** Gutter spacing */
  gutter?: number;
};

const PopoverComponent = (
  {
    children,
    visible = false,
    shrink,
    width = 380,
    minWidth,
    scrollable = true,
    flex,
    mobilePosition,
    hideOnEsc = true,
    hideOnClickOutside = true,
    hide,
    placement,
    gutter,
    ...rest
  }: Props,
  ref: React.Ref<HTMLDivElement>
) => {
  const isMobile = useMobile();

  // Custom Escape handler rather than using hideOnEsc from reakit so we can
  // prevent default behavior of exiting fullscreen.
  useKeyDown(
    "Escape",
    (event) => {
      if (visible && hideOnEsc !== false) {
        event.preventDefault();
        hide?.();
      }
    },
    {
      allowInInput: true,
    }
  );

  if (isMobile) {
    return (
      <Dialog.Root open={visible} onOpenChange={(open) => !open && hide?.()}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content
            onEscapeKeyDown={hideOnEsc ? hide : undefined}
            aria-describedby={undefined}
          >
            <Contents
              ref={ref}
              $shrink={shrink}
              $scrollable={scrollable}
              $flex={flex}
              $mobilePosition={mobilePosition}
            >
              {children}
            </Contents>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  // Convert reakit placement to Radix side
  const getSide = (placementProp?: string) => {
    if (!placementProp) {
      return "bottom";
    }
    if (placementProp.includes("top")) {
      return "top";
    }
    if (placementProp.includes("bottom")) {
      return "bottom";
    }
    if (placementProp.includes("left")) {
      return "left";
    }
    if (placementProp.includes("right")) {
      return "right";
    }
    return "bottom";
  };

  const getAlign = (placementProp?: string) => {
    if (!placementProp) {
      return "center";
    }
    if (placementProp.includes("start")) {
      return "start";
    }
    if (placementProp.includes("end")) {
      return "end";
    }
    return "center";
  };

  return (
    <Popover.Root open={visible} onOpenChange={(open) => !open && hide?.()}>
      <Popover.Portal>
        <StyledPopoverContent
          onEscapeKeyDown={hideOnEsc ? hide : undefined}
          onPointerDownOutside={hideOnClickOutside ? hide : undefined}
          side={getSide(placement)}
          align={getAlign(placement)}
          sideOffset={gutter ?? 5}
          aria-describedby={undefined}
          {...rest}
        >
          <Contents
            ref={ref}
            $shrink={shrink}
            $width={width}
            $minWidth={minWidth}
            $scrollable={scrollable}
            $flex={flex}
          >
            {children}
          </Contents>
        </StyledPopoverContent>
      </Popover.Portal>
    </Popover.Root>
  );
};

type ContentsProps = {
  $shrink?: boolean;
  $width?: number;
  $minWidth?: number;
  $flex?: boolean;
  $scrollable: boolean;
  $mobilePosition?: "top" | "bottom";
};

const StyledPopoverContent = styled(Popover.Content)`
  z-index: ${depths.modal};
`;

const Contents = styled.div<ContentsProps>`
  display: ${(props) => (props.$flex ? "flex" : "block")};
  animation: ${fadeAndScaleIn} 200ms ease;
  transform-origin: 75% 0;
  background: ${s("menuBackground")};
  border-radius: 6px;
  padding: ${(props) => (props.$shrink ? "6px 0" : "12px 24px")};
  max-height: 75vh;
  box-shadow: ${s("menuShadow")};
  ${(props) => props.$width && `width: ${props.$width}px`};
  ${(props) => props.$minWidth && `min-width: ${props.$minWidth}px`};

  ${(props) =>
    props.$scrollable
      ? `
      overflow-x: hidden;
      overflow-y: auto;
    `
      : `
      overflow: hidden;
    `}

  ${breakpoint("mobile", "tablet")`
    position: fixed;
    z-index: ${depths.menu};

    // 50 is a magic number that positions us nicely under the top bar
    top: ${(props: ContentsProps) =>
      props.$mobilePosition === "bottom" ? "auto" : "50px"};
    bottom: ${(props: ContentsProps) =>
      props.$mobilePosition === "bottom" ? "0" : "auto"};
    left: 8px;
    right: 8px;
    width: auto;
  `};
`;

export default React.forwardRef(PopoverComponent);
