import * as React from "react";
import styled from "styled-components";
import Tooltip from "~/components/Tooltip";

type Props = {
  tooltip?: string;
};

const WrappedTooltip: React.FC<Props> = ({ children, tooltip }) => (
  <Tooltip offset={[0, 16]} delay={150} tooltip={tooltip} placement="top">
    <TooltipContent>{children}</TooltipContent>
  </Tooltip>
);

const TooltipContent = styled.span`
  outline: none;
`;

export default WrappedTooltip;
