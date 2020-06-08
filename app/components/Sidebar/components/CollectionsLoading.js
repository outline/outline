// @flow
import * as React from 'react';
import styled from 'styled-components';
import Mask from 'components/Mask';

function CollectionsLoading() {
  return (
    <Wrapper>
      <Mask />
      <Mask />
      <Mask />
    </Wrapper>
  );
}

const Wrapper = styled.div`
  margin: 4px 16px;
  width: 75%;
`;

export default CollectionsLoading;
