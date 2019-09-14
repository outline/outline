// @flow
import styled from 'styled-components';

const Badge = styled.span`
  margin-left: 10px;
  padding: 2px 6px 3px;
  background-color: ${({ admin, theme }) =>
    admin ? theme.primary : theme.smokeDark};
  color: ${({ admin, theme }) => (admin ? theme.white : theme.text)};
  border-radius: 2px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  user-select: none;
`;

export default Badge;
