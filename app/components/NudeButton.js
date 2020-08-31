// @flow
import { lighten } from "polished";
import * as React from "react";
import styled from "styled-components";

const Button = styled.button`
  width: 24px;
  height: 24px;
  background: none;
  border-radius: 4px;
  line-height: 0;
  border: 0;
  padding: 0;

  &:focus {
    transition-duration: 0.05s;
    box-shadow: ${(props) => lighten(0.4, props.theme.buttonBackground)} 0px 0px
      0px 3px;
    outline: none;
  }
`;

export default React.forwardRef<any, typeof Button>((props, ref) => (
  <Button {...props} ref={ref} />
));
