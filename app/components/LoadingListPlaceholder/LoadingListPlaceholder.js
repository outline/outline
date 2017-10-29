// @flow
import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import styled from 'styled-components';
import { pulsate } from 'shared/styles/animations';
import { color } from 'shared/styles/constants';
import Flex from 'shared/components/Flex';

import { randomInteger } from 'shared/random';

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
      <Item column auto>
        <Mask style={{ width: randomValues[0] }} header />
        <Mask style={{ width: randomValues[1] }} />
      </Item>
      <Item column auto>
        <Mask style={{ width: randomValues[2] }} header />
        <Mask style={{ width: randomValues[3] }} />
      </Item>
    </ReactCSSTransitionGroup>
  );
};

const Item = styled(Flex)`
  padding: 18px 0;
`;

const Mask = styled(Flex)`
  height: ${props => (props.header ? 28 : 18)}px;
  margin-bottom: ${props => (props.header ? 18 : 0)}px;
  background-color: ${color.smoke};
  animation: ${pulsate} 1.3s infinite;
`;
