// @flow
import styled from 'styled-components';
import { color } from 'styles/constants';

const InlineCode = styled.code`
  padding: .25em;
  background: ${color.smoke};
  border-radius: 4px;
  border: 1px solid ${color.smokeDark};
`;

export default InlineCode;
