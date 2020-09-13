// @flow
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
`;

export default React.forwardRef<any, typeof Button>((props, ref) => (
  <Button {...props} ref={ref} />
));
