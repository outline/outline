// @flow
import * as React from 'react';
import styled from 'styled-components';

type Props = {
  onClick?: (SyntheticEvent<*>) => *,
  children?: React.Node,
};

const DropdownMenuItem = ({ onClick, children, ...rest }: Props) => {
  return (
    <MenuItem onClick={onClick} {...rest}>
      {children}
    </MenuItem>
  );
};

const MenuItem = styled.a`
  display: flex;
  margin: 0;
  padding: 6px 12px;
  height: 32px;

  color: ${props => props.theme.slateDark};
  justify-content: left;
  align-items: center;
  cursor: pointer;
  font-size: 15px;

  svg {
    margin-right: 8px;
  }

  &:hover {
    color: ${props => props.theme.white};
    background: ${props => props.theme.primary};

    svg {
      fill: ${props => props.theme.white};
    }
  }
`;

export default DropdownMenuItem;
