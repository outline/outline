// @flow
import React from 'react';
import _ from 'lodash';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import styled from 'styled-components';
import Mask from './components/Mask';
import Flex from 'shared/components/Flex';

type Props = {
  count?: number,
};

const ListPlaceHolder = ({ count }: Props) => {
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
      {_.times(count || 2, index => (
        <Item key={index} column auto>
          <Mask header />
          <Mask />
        </Item>
      ))}
    </ReactCSSTransitionGroup>
  );
};

const Item = styled(Flex)`
  padding: 18px 0;
`;

export default ListPlaceHolder;
