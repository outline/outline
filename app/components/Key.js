// @flow
import styled from 'styled-components';

const Key = styled.kbd`
  display: inline-block;
  padding: 4px 6px;
  font: 11px 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier,
    monospace;
  line-height: 10px;
  color: ${props => props.theme.almostBlack};
  vertical-align: middle;
  background-color: ${props => props.theme.smokeLight};
  border: solid 1px ${props => props.theme.slateLight};
  border-bottom-color: ${props => props.theme.slate};
  border-radius: 3px;
  box-shadow: inset 0 -1px 0 ${props => props.theme.slate};
`;

export default Key;
