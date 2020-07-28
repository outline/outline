// @flow
import * as React from "react";
import breakpoint from "styled-components-breakpoint";
import styled from "styled-components";
import Centered from "./Centered";

type Props = {
  children: React.Node,
  background?: string,
};

const Header = ({ children, background }: Props) => {
  return (
    <Wrapper background={background}>
      <Centered>{children}</Centered>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  width: 100%;
  padding: 8em 0 3em;
  position: relative;

  margin-top: -70px;
  margin-bottom: 2em;
  text-align: center;
  background: ${props => props.background || "transparent"};
  z-index: -1;

  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: -30px;
    width: 100vw;
    height: 100%;
    background: ${props => props.background || "transparent"};
    z-index: -10;
  }

  p {
    font-size: 22px;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.6);
    margin: 0;
  }

  h1 {
    font-size: 2em;
    margin: 0 0 0.1em;
  }

  ${breakpoint("tablet")`
    padding: 8em 3em 3em 3em;

    h1 {
      font-size: 4em;
    }
  `};
`;

export default Header;
