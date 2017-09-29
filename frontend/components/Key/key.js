// @flow
import styled from 'styled-components';
import { color } from 'styles/constants';

const Key = styled.kbd`
  display: inline-block;
  padding: 4px 6px;
  font: 11px "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
  line-height: 10px;
  color: ${color.text};
  vertical-align: middle;
  background-color: ${color.smokeLight};
  border: solid 1px ${color.slateLight};
  border-bottom-color: ${color.slate};
  border-radius: 3px;
  box-shadow: inset 0 -1px 0 ${color.slate};
`;

export default Key;
