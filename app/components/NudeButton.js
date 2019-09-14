// @flow
import * as React from 'react';
import styled from 'styled-components';
import { lighten } from 'polished';

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
    box-shadow: ${props => lighten(0.4, props.theme.buttonBackground)} 0px 0px
      0px 3px;
    outline: none;
  }
`;

// $FlowFixMe - need to upgrade to get forwardRef
export default React.forwardRef((props, ref) => (
  <Button {...props} ref={ref} />
));
