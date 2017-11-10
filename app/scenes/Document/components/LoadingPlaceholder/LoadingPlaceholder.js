// @flow
import React from 'react';
import styled from 'styled-components';
import { fadeIn, pulsate } from 'shared/styles/animations';
import { color } from 'shared/styles/constants';
import Flex from 'shared/components/Flex';

import { randomInteger } from 'shared/random';

const randomValues = Array.from(
  new Array(5),
  () => `${randomInteger(85, 100)}%`
);

export default (props: Object) => {
  return (
    <Fade>
      <Flex column auto {...props}>
        <Mask style={{ width: randomValues[0] }} header />
        <Mask style={{ width: randomValues[1] }} />
        <Mask style={{ width: randomValues[2] }} />
        <Mask style={{ width: randomValues[3] }} />
      </Flex>
    </Fade>
  );
};

const Fade = styled.span`
  animation: ${fadeIn} 150ms ease-in-out;
`;

const Mask = styled(Flex)`
  height: ${props => (props.header ? 28 : 18)}px;
  margin-bottom: ${props => (props.header ? 32 : 14)}px;
  background-color: ${color.smoke};
  animation: ${pulsate} 1.3s infinite;
`;
