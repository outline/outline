import * as React from "react";
import { Dialog } from "reakit/Dialog";
import { Popover as ReakitPopover, PopoverProps } from "reakit/Popover";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import useKeyDown from "~/hooks/useKeyDown";
import useMobile from "~/hooks/useMobile";
import { fadeAndScaleIn } from "~/styles/animations";

type Props = PopoverProps & {
  children: React.ReactNode;
  width?: number;
  shrink?: boolean;
  flex?: boolean;
  tabIndex?: number;
  scrollable?: boolean;
  mobilePosition?: "top" | "bottom";
  show: () => void;
  hide: () => void;
};

const Popover: React.FC<Props> = ({
  children,
  shrink,
  width = 380,
  scrollable = true,
  flex,
  mobilePosition,
  ...rest
}: Props) => {
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
    <ReakitPopover {...rest} hideOnEsc={false}>
      <Contents
        $shrink={shrink}
        $width={width}
        $scrollable={scrollable}
        $flex={flex}
      >
        {children}
      </Contents>
    </ReakitPopover>
  );
};

type ContentsProps = {
  $shrink?: boolean;
  $width?: number;
  $flex?: boolean;
  $scrollable: boolean;
  $mobilePosition?: "top" | "bottom";
};

const Contents = styled.div<ContentsProps>`
  display: ${(props) => (props.$flex ? "flex" : "block")};
  animation: ${fadeAndScaleIn} 200ms ease;
  transform-origin: 75% 0;
  background: ${s("menuBackground")};
  border-radius: 6px;
  padding: ${(props) => (props.$shrink ? "6px 0" : "12px 24px")};
  max-height: 75vh;
  box-shadow: ${s("menuShadow")};
  width: ${(props) => props.$width}px;

  ${(props) =>
    props.$scrollable &&
    css`
      overflow-x: hidden;
      overflow-y: auto;
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

export default Popover;
