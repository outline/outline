// @flow
import styled from 'styled-components';
import Centered from './Centered';

const Hero = styled(Centered)`
  width: 100%;
  min-height: 500px;
  padding: 4em 0 0;

  h1 {
    font-size: 3.5em;
    line-height: 1em;
  }

  h2 {
    font-size: 2.5em;
    line-height: 1em;
  }
`;

export default Hero;
