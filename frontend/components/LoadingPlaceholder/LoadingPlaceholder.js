// @flow
import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import styled from 'styled-components';
import { pulsate } from 'styles/animations';
import { color } from 'styles/constants';
import Flex from 'components/Flex';

import { randomInteger } from 'utils/random';

const randomValues = Array.from(
  new Array(5),
  () => `${randomInteger(85, 100)}%`
);

export default (props: Object) => {
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
      <Flex column auto {...props}>
        <Mask style={{ width: randomValues[0] }} header />
        <Mask style={{ width: randomValues[1] }} />
        <Mask style={{ width: randomValues[2] }} />
        <Mask style={{ width: randomValues[3] }} />
      </Flex>
    </ReactCSSTransitionGroup>
  );
};

const Mask = styled(Flex)`
  height: ${props => (props.header ? 28 : 18)}px;
  margin-bottom: ${props => (props.header ? 32 : 14)}px;
  background-color: ${color.smoke};
  animation: ${pulsate} 1.3s infinite;
`;
