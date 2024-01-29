import * as React from "react";
import styled from "styled-components";
import Tooltip from "~/components/Tooltip";

type Props = {
  children?: React.ReactNode;
  tooltip?: string;
};

const WrappedTooltip: React.FC<Props> = ({ children, tooltip }: Props) => (
  <Tooltip offset={[0, 16]} delay={150} tooltip={tooltip} placement="top">
    <TooltipContent>{children}</TooltipContent>
  </Tooltip>
);

const TooltipContent = styled.span`
  outline: none;
`;

export default WrappedTooltip;
