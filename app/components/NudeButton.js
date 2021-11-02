// @flow
import * as React from "react";
import styled from "styled-components";

const Button = styled.button`
  width: ${(props) => props.width || props.size}px;
  height: ${(props) => props.height || props.size}px;
  background: ${(props) =>
    props.isOverlay ? props.theme.menuBackground : "none"};
  ${(props) =>
    props.isOverlay
      ? `box-shadow: rgba(0, 0, 0, 0.07) 0px 1px 2px, ${props.theme.buttonNeutralBorder} 0 0 0 1px inset;`
      : ""}
  border-radius: 4px;
  line-height: 0;
  border: 0;
  padding: 0;
  cursor: pointer;
  user-select: none;
  color: inherit;
`;

export default React.forwardRef<any, typeof Button>(
  ({ size = 24, ...props }, ref) => <Button size={size} {...props} ref={ref} />
);
