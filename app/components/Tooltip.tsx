import Tippy, { TippyProps } from "@tippy.js/react";
import { TFunctionResult } from "i18next";
import * as React from "react";
import styled from "styled-components";

export type Props = Omit<TippyProps, "content" | "theme"> & {
  tooltip: React.ReactChild | React.ReactChild[] | TFunctionResult;
  shortcut?: React.ReactNode;
};

function Tooltip({ shortcut, tooltip, delay = 50, ...rest }: Props) {
  let content = <>{tooltip}</>;

  if (!tooltip) {
    return rest.children;
  }

  if (shortcut) {
    content = (
      <>
        {tooltip} &middot; <Shortcut>{shortcut}</Shortcut>
      </>
    );
  }

  return (
    <StyledTippy
      arrow
      arrowType="round"
      animation="shift-away"
      content={content}
      delay={delay}
      duration={[200, 150]}
      inertia
      {...rest}
    />
  );
}

const Shortcut = styled.kbd`
  position: relative;
  top: -2px;

  display: inline-block;
  padding: 2px 4px;
  font: 10px "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier,
    monospace;
  line-height: 10px;
  color: ${(props) => props.theme.tooltipBackground};
  vertical-align: middle;
  background-color: ${(props) => props.theme.tooltipText};
  border-radius: 3px;
`;

const StyledTippy = styled(Tippy)`
  font-size: 13px;
  background-color: ${(props) => props.theme.tooltipBackground};
  color: ${(props) => props.theme.tooltipText};

  svg {
    fill: ${(props) => props.theme.tooltipBackground};
  }
`;

export default Tooltip;
