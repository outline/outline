// @flow
import React from 'react';
import styled from 'styled-components';
import Flex from 'components/Flex';
import { color } from 'shared/styles/constants';

const DropdownMenuItem = ({
  onClick,
  children,
}: {
  onClick?: SyntheticEvent => void,
  children?: React.Element<any>,
}) => {
  return (
    <MenuItem onClick={onClick}>
      {children}
    </MenuItem>
  );
};

const MenuItem = styled(Flex)`
  margin: 0;
  padding: 5px 10px;
  height: 32px;

  color: ${color.slateDark};
  justify-content: left;
  align-items: center;
  cursor: pointer;
  font-size: 15px;

  svg {
    margin-right: 8px;
  }

  a {
    text-decoration: none;
    width: 100%;
  }

  &:hover {
    color: ${color.white};
    background: ${color.primary};

    svg {
      fill: ${color.white};
    }
  }
`;

export default DropdownMenuItem;
