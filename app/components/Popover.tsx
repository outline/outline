import * as React from "react";
import { Dialog } from "reakit/Dialog";
import { Popover as ReakitPopover } from "reakit/Popover";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import useMobile from "~/hooks/useMobile";
import { fadeAndScaleIn } from "~/styles/animations";

type Props = {
  tabIndex?: number;
  width?: number;
};

const Popover: React.FC<Props> = ({ children, width = 380, ...rest }) => {
  const isMobile = useMobile();

  if (isMobile) {
    return (
      <Dialog {...rest} modal>
        <Contents>{children}</Contents>
      </Dialog>
    );
  }

  return (
    <ReakitPopover {...rest}>
      <Contents $width={width}>{children}</Contents>
    </ReakitPopover>
  );
};

const Contents = styled.div<{ $width?: number }>`
  animation: ${fadeAndScaleIn} 200ms ease;
  transform-origin: 75% 0;
  background: ${(props) => props.theme.menuBackground};
  border-radius: 6px;
  padding: 12px 24px;
  max-height: 50vh;
  overflow-y: scroll;
  box-shadow: ${(props) => props.theme.menuShadow};
  width: ${(props) => props.$width}px;

  ${breakpoint("mobile", "tablet")`
    position: fixed;
    z-index: ${(props: any) => props.theme.depths.menu};

    // 50 is a magic number that positions us nicely under the top bar
    top: 50px;
    left: 8px;
    right: 8px;
    width: auto;
  `};
`;

export default Popover;
