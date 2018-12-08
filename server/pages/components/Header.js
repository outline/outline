// @flow
import * as React from 'react';
import styled from 'styled-components';
import Centered from './Centered';

type Props = {
  children: React.Node,
};

const Header = ({ children }: Props) => {
  return (
    <Wrapper>
      <Centered>{children}</Centered>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  width: 100%;
  padding: 2em;
  background: ${props => props.theme.contentHeaderBackground};
  margin-bottom: 2em;

  p {
    font-size: 22px;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.6);
    margin: 0;
  }

  h1 {
    font-size: 3.5em;
    margin: 0 0 0.1em;
  }
`;

export default Header;
