// @flow
import styled from 'styled-components';

const Subheading = styled.h3`
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${props => props.theme.textTertiary};
  border-bottom: 1px solid ${props => props.theme.divider};
  padding-bottom: 8px;
  margin-top: 30px;
  margin-bottom: 10px;
`;

export default Subheading;
