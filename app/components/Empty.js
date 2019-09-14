// @flow
import * as React from 'react';
import styled from 'styled-components';

type Props = {
  children: React.Node,
};

const Empty = (props: Props) => {
  const { children, ...rest } = props;
  return <Container {...rest}>{children}</Container>;
};

const Container = styled.div`
  display: flex;
  color: ${props => props.theme.slate};
  text-align: center;
`;

export default Empty;
