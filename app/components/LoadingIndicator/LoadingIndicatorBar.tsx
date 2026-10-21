import styled, { keyframes } from "styled-components";
import { depths, s } from "@shared/styles";

const LoadingIndicatorBar = () => (
  <Container>
    <Loader />
  </Container>
);

const loadingFrame = keyframes`
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
`;

const Container = styled.div`
  position: fixed;
  top: 0;
  z-index: ${depths.loadingIndicatorBar};
  width: 100%;
  animation: ${loadingFrame} 4s ease-in-out infinite;
  animation-delay: 250ms;
  transform: translateX(-100%);
`;

const Loader = styled.div`
  width: 100%;
  height: 2px;
  background-color: ${s("accent")};
`;

export default LoadingIndicatorBar;
