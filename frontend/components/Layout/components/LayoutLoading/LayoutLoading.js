// @flow
import React from 'react';
import styled, { keyframes } from 'styled-components';
import { color } from 'styles/constants';

const LayoutLoading = () => {
  return (
    <Container>
      <Loader />
    </Container>
  );
};

const loadingAnimation = keyframes`
  from {margin-left: -100%; z-index:100;}
  to {margin-left: 100%; }
`;

const Container = styled.div`
  width: 100%;
  height: 2px;
  background-color: ${color.highlight};
`;

const Loader = styled.div`
  position: fixed;
  top: 0;
  z-index: 9999;

  background-color: ${color.highlight};
  width: 100%;
  animation: ${loadingAnimation} 4s ease-in-out infinite;
`;

export default LayoutLoading;
