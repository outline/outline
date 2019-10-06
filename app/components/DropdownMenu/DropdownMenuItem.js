// @flow
import * as React from 'react';
import styled from 'styled-components';

type Props = {
  onClick?: (SyntheticEvent<>) => void | Promise<void>,
  children?: React.Node,
  disabled?: boolean,
};

const DropdownMenuItem = ({ onClick, children, disabled, ...rest }: Props) => {
  return (
    <MenuItem
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...rest}
    >
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

  svg {
    opacity: ${props => (props.disabled ? '.5' : 1)};
  }

  ${props =>
    props.disabled
      ? 'pointer-events: none;'
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
