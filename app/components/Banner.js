// @flow
import * as React from 'react';
import styled from 'styled-components';

type Props = {
  type: string,
  children: React.Node,
};

const Banner = (props: Props) => {
  return <Container {...props} />;
};

const Container = styled.div`
  padding: 8px 12px;
  color: ${props => props.theme.white};
  background: ${props => props.theme[props.type]};
  font-size: 15px;
  border-radius: 5px;
  cursor: default;

  a {
    color: ${props => props.theme.white};
    text-decoration: underline;
  }
`;

export default Banner;
