// @flow
import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import Mask from './components/Mask';
import Flex from 'shared/components/Flex';

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
      <Flex column auto {...props}>
        <Mask header />
        <Mask />
        <Mask />
        <Mask />
      </Flex>
    </ReactCSSTransitionGroup>
  );
};
