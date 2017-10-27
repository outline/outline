// @flow
import styledNormalize from 'styled-normalize';
import { injectGlobal } from 'styled-components';
import base from './base';

export default () => injectGlobal`
  ${styledNormalize}
  ${base}
`;
