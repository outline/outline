import * as React from "react";
import styled from "styled-components";
import Tooltip, { Props } from "~/components/Tooltip";

const WrappedTooltip: React.FC<Props> = ({
  children,
  content,
  ...rest
}: Props) => (
  <Tooltip
    sideOffset={16}
    delayDuration={150}
    content={content}
    side="top"
    shortcutOnNewline
    {...rest}
  >
    <TooltipContent>{children}</TooltipContent>
  </Tooltip>
);

const TooltipContent = styled.span`
  outline: none;
`;

export default WrappedTooltip;
