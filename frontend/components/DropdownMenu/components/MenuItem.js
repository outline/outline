// @flow
import React from 'react';
import styled from 'styled-components';
import { color } from 'styles/constants';

type Props = {
  onClick?: Function,
  children?: React.Element<any>,
};

const Label = styled.div`
  margin: 0;
  padding: 8px 12px;

  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  color: ${color.slateDark};

  &:hover {
    color: ${color.black};
  }
`;

const MenuItem = ({ onClick, children }: Props) => {
  return (
    <Label onClick={onClick}>
      {children}
    </Label>
  );
};

export default MenuItem;
