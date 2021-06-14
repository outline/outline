// @flow
import * as React from "react";
import styled from "styled-components";

const Button = styled.button`
  width: ${(props) => props.width || props.size}px;
  height: ${(props) => props.height || props.size}px;
  background: none;
  border-radius: 4px;
  line-height: 0;
  border: 0;
  padding: 0;
  cursor: pointer;
  user-select: none;
`;

export default React.forwardRef<any, typeof Button>(
  ({ size = 24, ...props }, ref) => <Button size={size} {...props} ref={ref} />
);
