// @flow
import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import styled, { keyframes } from 'styled-components';
import { Flex } from 'reflexbox';

import { randomInteger } from 'utils/random';

const randomValues = Array.from(
  new Array(5),
  () => `${randomInteger(85, 100)}%`
);

export default () => {
  return (
    <ReactCSSTransitionGroup
      transitionName="fadeIn"
      transitionAppear
      transitionEnter
      transitionLeave
      transitionAppearTimeout={0}
      transitionEnterTimeout={0}
      transitionLeaveTimeout={0}
    >
      <Flex column auto>
        <Mask style={{ width: randomValues[0] }} header />
        <Mask style={{ width: randomValues[1] }} />
        <Mask style={{ width: randomValues[2] }} />
        <Mask style={{ width: randomValues[3] }} />
      </Flex>
    </ReactCSSTransitionGroup>
  );
};

const pulsate = keyframes`
  0%   { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`;

const Mask = styled(Flex)`
  height: ${props => (props.header ? 28 : 18)}px;
  margin-bottom: ${props => (props.header ? 32 : 14)}px;
  background-color: #ddd;
  animation: ${pulsate} 1.3s infinite;
`;
