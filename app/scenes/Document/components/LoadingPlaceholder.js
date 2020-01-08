// @flow
import * as React from 'react';
import styled from 'styled-components';
import { pulsate } from 'shared/styles/animations';
import Flex from 'shared/components/Flex';
import Fade from 'components/Fade';

import { randomInteger } from 'shared/random';

const randomValues = Array.from(
  new Array(5),
  () => `${randomInteger(85, 100)}%`
);

const LoadingPlaceholder = () => {
  return (
    <Wrapper>
      <Flex column auto>
        <Mask style={{ width: randomValues[0] }} header />
        <Mask style={{ width: randomValues[1] }} />
        <Mask style={{ width: randomValues[2] }} />
        <Mask style={{ width: randomValues[3] }} />
      </Flex>
    </Wrapper>
  );
};

const Wrapper = styled(Fade)`
  margin: 40px 0;
`;

const Mask = styled(Flex)`
  height: ${props => (props.header ? 28 : 18)}px;
  margin-bottom: ${props => (props.header ? 32 : 14)}px;
  background-color: ${props => props.theme.smoke};
  animation: ${pulsate} 1.3s infinite;
`;

export default LoadingPlaceholder;
