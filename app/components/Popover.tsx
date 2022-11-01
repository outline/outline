import * as React from "react";
import { Dialog } from "reakit/Dialog";
import { Popover as ReakitPopover, PopoverProps } from "reakit/Popover";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths } from "@shared/styles";
import useMobile from "~/hooks/useMobile";
import { fadeAndScaleIn } from "~/styles/animations";

type Props = PopoverProps & {
  children: React.ReactNode;
  width?: number;
  shrink?: boolean;
  tabIndex?: number;
  scrollable?: boolean;
};

const Popover: React.FC<Props> = ({
  children,
  shrink,
  width = 380,
  scrollable = true,
  ...rest
}) => {
  const isMobile = useMobile();

  if (isMobile) {
    return (
      <Dialog {...rest} modal>
        <Contents $shrink={shrink} $width={width} $scrollable={scrollable}>
          {children}
        </Contents>
      </Dialog>
    );
  }

  return (
    <ReakitPopover {...rest}>
      <Contents $shrink={shrink} $width={width} $scrollable={scrollable}>
        {children}
      </Contents>
    </ReakitPopover>
  );
};

type ContentProps = {
  $shrink?: boolean;
  $width?: number;
  $scrollable?: boolean;
};

const Contents = styled.div<ContentProps>`
  animation: ${fadeAndScaleIn} 200ms ease;
  transform-origin: 75% 0;
  background: ${(props) => props.theme.menuBackground};
  border-radius: 6px;
  padding: ${(props) => (props.$shrink ? "6px 0" : "12px 24px")};
  max-height: 50vh;
  overflow-y: ${(props) => (props.$scrollable ? "auto" : "visible")};
  box-shadow: ${(props) => props.theme.menuShadow};
  width: ${(props) => props.$width}px;

  ${breakpoint("mobile", "tablet")`
    position: fixed;
    z-index: ${depths.menu};

    // 50 is a magic number that positions us nicely under the top bar
    top: 50px;
    left: 8px;
    right: 8px;
  `};
`;

export default Popover;
