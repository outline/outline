// @flow
import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import styled from 'styled-components';
import Mask from './components/Mask';
import Flex from 'components/Flex';

export default (props: Object) => {
  return (
    <ReactCSSTransitionGroup
      transitionName="fadeIn"
      transitionAppearTimeout={0}
      transitionEnterTimeout={0}
      transitionLeaveTimeout={0}
      transitionAppear
      transitionEnter
      transitionLeave
    >
      <Item column auto>
        <Mask header />
        <Mask />
      </Item>
      <Item column auto>
        <Mask header />
        <Mask />
      </Item>
    </ReactCSSTransitionGroup>
  );
};

const Item = styled(Flex)`
  padding: 18px 0;
`;
