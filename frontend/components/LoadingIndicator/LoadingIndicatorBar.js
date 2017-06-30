// @flow
import React from 'react';
import styled, { keyframes } from 'styled-components';

const LoadingIndicatorBar = () => {
  return (
    <Container>
      <Loader />
    </Container>
  );
};

const loadingFrame = keyframes`
  from {margin-left: -100%; z-index:100;}
  to {margin-left: 100%; }
`;

const Container = styled.div`
  position: fixed;
  top: 0;
  z-index: 9999;

  background-color: #03A9F4;
  width: 100%;
  animation: ${loadingFrame} 4s ease-in-out infinite;
`;

const Loader = styled.div`
  width: 100%;
  height: 2px;
  background-color: #03A9F4;
`;

export default LoadingIndicatorBar;
