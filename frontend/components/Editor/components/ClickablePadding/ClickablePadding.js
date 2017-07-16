// @flow
import React from 'react';
import styled from 'styled-components';

type Props = {
  onClick?: ?Function,
  grow?: boolean,
};

const ClickablePadding = (props: Props) => {
  return <Container grow={props.grow} onClick={props.onClick} />;
};

const Container = styled.div`
  min-height: 150px;
  padding-top: 50px;
  cursor: ${({ onClick }) => (onClick ? 'text' : 'default')};

  ${({ grow }) => grow && `flex-grow: 1;`}
`;

export default ClickablePadding;
