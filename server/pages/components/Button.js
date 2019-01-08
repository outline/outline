// @flow
import styled from 'styled-components';

const Button = styled.a`
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  color: ${props => props.theme.white};
  background: ${props => props.theme.black};
  border-radius: 4px;
  font-weight: 600;
  height: 56px;
`;

export default Button;
