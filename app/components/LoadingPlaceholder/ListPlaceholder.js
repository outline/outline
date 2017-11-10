// @flow
import React from 'react';
import _ from 'lodash';
import styled from 'styled-components';
import { fadeIn } from 'shared/styles/animations';
import Mask from './components/Mask';
import Flex from 'shared/components/Flex';

type Props = {
  count?: number,
};

const ListPlaceHolder = ({ count }: Props) => {
  return (
    <Fade>
      {_.times(count || 2, index => (
        <Item key={index} column auto>
          <Mask header />
          <Mask />
        </Item>
      ))}
    </Fade>
  );
};

const Fade = styled.span`
  animation: ${fadeIn} 150ms ease-in-out;
`;

const Item = styled(Flex)`
  padding: 18px 0;
`;

export default ListPlaceHolder;
