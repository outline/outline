// @flow
import styled from 'styled-components';
import { color } from 'shared/styles/constants';

const InlineCode = styled.code.attrs({
  spellCheck: false,
})`
  padding: 0.25em;
  background: ${color.smoke};
  border-radius: 4px;
  border: 1px solid ${color.smokeDark};
`;

export default InlineCode;
