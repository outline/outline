// @flow
import React from 'react';
import styled from 'styled-components';
import { color } from 'styles/constants';

const DropdownMenuItem = ({
  onClick,
  children,
}: {
  onClick?: Function,
  children?: React.Element<any>,
}) => {
  return (
    <MenuItem onClick={onClick}>
      {children}
    </MenuItem>
  );
};

const MenuItem = styled.div`
  margin: 0;
  padding: 5px 10px;
  height: 32px;

  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-size: 15px;

  a {
    text-decoration: none;
    width: 100%;
  }

  &:hover {
    color: ${color.white};
    background: ${color.primary};
  }
`;

export default DropdownMenuItem;
