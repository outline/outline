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
  width?: number;
  minWidth?: number;
  shrink?: boolean;
  flex?: boolean;
  tabIndex?: number;
  scrollable?: boolean;
  mobilePosition?: "top" | "bottom";
  show: () => void;
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

  // Filter out unstable Reakit props and non-HTML props (including `place`)
  const {
    unstable_referenceRef,
    unstable_popoverRef,
    unstable_arrowRef,
    unstable_popoverStyles,
    unstable_arrowStyles,
    unstable_originalPlacement,
    unstable_update,
    place, // Exclude `place` from being passed to the DOM
    mobilePosition: _mobilePosition, // Exclude this as well
    show: _show, 
    hide: _hide, 
    ...cleanRest
  } = rest;

  useKeyDown(
    "Escape",
    (event) => {
      if (cleanRest.visible && cleanRest.hideOnEsc !== false) {
        event.preventDefault();
        cleanRest.hide();
      }
    },
    {
      allowInInput: true,
    }
  );

  if (isMobile) {
    return (
      <Dialog {...cleanRest} modal>
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
    <StyledPopover {...cleanRest} hideOnEsc={false} hideOnClickOutside>
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
