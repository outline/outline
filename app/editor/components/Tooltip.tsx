import * as React from "react";
import styled from "styled-components";
import Tooltip from "~/components/Tooltip";

type Props = {
  /** The content to display in the tooltip. */
  content?: string;
  children?: React.ReactNode;
};

const WrappedTooltip: React.FC<Props> = ({ children, content }: Props) => (
  <Tooltip offset={[0, 16]} delay={150} content={content} placement="top">
    <TooltipContent>{children}</TooltipContent>
  </Tooltip>
);

const TooltipContent = styled.span`
  outline: none;
`;

export default WrappedTooltip;
