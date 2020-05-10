// @flow
import * as React from 'react';
import styled from 'styled-components';
import Mask from 'components/Mask';
import Fade from 'components/Fade';
import Flex from 'shared/components/Flex';

export default function LoadingPlaceholder(props: Object) {
  return (
    <Wrapper>
      <Flex column auto {...props}>
        <Mask height={34} />
        <br />
        <Mask />
        <Mask />
        <Mask />
      </Flex>
    </Wrapper>
  );
}

const Wrapper = styled(Fade)`
  display: block;
  margin: 40px 0;
`;
