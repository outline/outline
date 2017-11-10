// @flow
import React from 'react';
import styled from 'styled-components';
import { fadeIn } from 'shared/styles/animations';
import Mask from './components/Mask';
import Flex from 'shared/components/Flex';

export default function LoadingPlaceholder(props: Object) {
  return (
    <Fade>
      <Flex column auto {...props}>
        <Mask header />
        <Mask />
        <Mask />
        <Mask />
      </Flex>
    </Fade>
  );
}

const Fade = styled.span`
  animation: ${fadeIn} 150ms ease-in-out;
`;
