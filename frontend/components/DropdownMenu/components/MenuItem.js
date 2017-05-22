// @flow
import React from 'react';
import styled from 'styled-components';

type Props = {
  onClick?: Function,
  children?: React.Element<any>,
};

const Label = styled.div`
  margin: 0;
  padding: 5px 10px;
  height: 32px;

  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  border-left: 2px solid transparent;

  span {
    margin-top: 2px;
  }

  a {
    color: $textColor;
    text-decoration: none;
    width: 100%;
  }

  &:hover {
    border-left: 2px solid green;
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
