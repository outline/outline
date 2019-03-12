// @flow
import * as React from 'react';
import styled from 'styled-components';

type Props = {
  onClick?: (SyntheticEvent<*>) => *,
  children?: React.Node,
  disabled?: boolean,
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

  color: ${props =>
    props.disabled ? props.theme.textTertiary : props.theme.textSecondary};
  justify-content: left;
  align-items: center;
  font-size: 15px;
  cursor: default;

  svg:not(:last-child) {
    margin-right: 8px;
  }

  ${props =>
    props.disabled
      ? ''
      : `

  &:hover {
    color: ${props.theme.white};
    background: ${props.theme.primary};
    cursor: pointer;

    svg {
      fill: ${props.theme.white};
    }
  }
  `};
`;

export default DropdownMenuItem;
