// @flow
import { keyframes } from 'styled-components';

export const modalFadeIn = keyframes`
  from {
    opacity: 0;
    transform: scale(.98);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
`;
