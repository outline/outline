// @flow
import * as React from 'react';
import styled from 'styled-components';
import Flex from 'shared/components/Flex';

const Divider = () => {
  return (
    <Flex auto justify="center">
      <Content />
    </Flex>
  );
};

const Content = styled.span`
  display: flex;
  width: 50%;
  margin: 20px 0;
  border-bottom: 1px solid #eee;
`;

export default Divider;
