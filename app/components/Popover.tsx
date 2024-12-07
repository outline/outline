import * as React from "react";
import { Dialog } from "reakit/Dialog";
import { Popover as ReakitPopover, PopoverProps } from "reakit/Popover";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import useKeyDown from "~/hooks/useKeyDown";
import useMobile from "~/hooks/useMobile";
import { fadeAndScaleIn } from "~/styles/animations";

type Props = PopoverProps & {
  children: React.ReactNode;
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
  show: () => void;
  /** Function to hide the popover */
  hide: () => void;
};

const Popover = (
  {
    children,
    shrink,
    width = 380,
    minWidth,
    scrollable = true,
    flex,
    mobilePosition,
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
      if (rest.visible && rest.hideOnEsc !== false) {
        event.preventDefault();
        rest.hide();
      }
    },
    {
      allowInInput: true,
    }
  );

  if (isMobile) {
    return (
      <Dialog {...rest} modal>
        <Contents
          ref={ref}
          $shrink={shrink}
          $scrollable={scrollable}
          $flex={flex}
          $mobilePosition={mobilePosition}
        >
          {children}
        </Contents>
      </Dialog>
    );
  }

  return (
    <StyledPopover {...rest} hideOnEsc={false} hideOnClickOutside>
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
    </StyledPopover>
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

const StyledPopover = styled(ReakitPopover)`
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

export default React.forwardRef(Popover);
