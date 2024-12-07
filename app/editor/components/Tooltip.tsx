import * as React from "react";
import styled from "styled-components";
import Tooltip, { Props } from "~/components/Tooltip";

const WrappedTooltip: React.FC<Props> = ({
  children,
  content,
  ...rest
}: Props) => (
  <Tooltip
    offset={[0, 16]}
    delay={150}
    content={content}
    placement="top"
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
