// @flow
import styled from 'styled-components';
import { color } from 'shared/styles/constants';

const Subheading = styled.h3`
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  color: ${color.slate};
  letter-spacing: 0.04em;
  border-bottom: 1px solid ${color.slateLight};
  padding-bottom: 8px;
  margin-top: 30px;
  margin-bottom: 10px;
`;

export default Subheading;
