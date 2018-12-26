// @flow
import styledNormalize from 'styled-normalize';
import { createGlobalStyle } from 'styled-components';
import base from './base';

export default createGlobalStyle`
  ${styledNormalize}
  ${base}
`;
