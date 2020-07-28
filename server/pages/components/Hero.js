// @flow
import styled from "styled-components";
import Centered from "./Centered";

const Hero = styled(Centered)`
  width: 100%;
  margin-top: 50vh;
  transform: translateY(-50%);

  h1 {
    font-size: 3.5em;
    line-height: 1em;
    margin-top: 0;
  }

  h2 {
    font-size: 2.5em;
    line-height: 1em;
  }
`;

export default Hero;
