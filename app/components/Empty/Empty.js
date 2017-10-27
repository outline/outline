// @flow
import React from 'react';
import styled from 'styled-components';
import { color } from 'shared/styles/constants';

type Props = {
  children: string,
};

const Empty = (props: Props) => {
  const { children, ...rest } = props;
  return <Container {...rest}>{children}</Container>;
};

const Container = styled.div`
  display: flex;
  color: ${color.slate};
  text-align: center;
`;

export default Empty;
