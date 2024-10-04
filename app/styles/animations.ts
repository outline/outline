import { keyframes } from "styled-components";

export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const fadeOutCursor = keyframes`
  0% { opacity: 1; }
  90% { opacity: 1; }
  100% { opacity: 0; }
`;

export const fadeAndScaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(.98);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
`;

export const fadeAndSlideDown = keyframes`
  from {
    opacity: 0;
    transform: scale(.98) translateY(-10px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0px);
  }
`;

export const fadeAndSlideUp = keyframes`
  from {
    opacity: 0;
    transform: scale(.98) translateY(10px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0px);
  }
`;

export const mobileContextMenu = keyframes`
  from {
    opacity: 0;
    transform: scale(.98) translateY(10vh);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0px);
  }
`;

export const bounceIn = keyframes`
  from,
  20%,
  40%,
  60%,
  80%,
  to {
    -webkit-animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
  }

  0% {
    opacity: 0;
    -webkit-transform: scale3d(0.3, 0.3, 0.3);
    transform: scale3d(0.3, 0.3, 0.3);
  }

  20% {
    -webkit-transform: scale3d(1.1, 1.1, 1.1);
    transform: scale3d(1.1, 1.1, 1.1);
  }

  40% {
    -webkit-transform: scale3d(0.9, 0.9, 0.9);
    transform: scale3d(0.9, 0.9, 0.9);
  }

  60% {
    opacity: 1;
    -webkit-transform: scale3d(1.03, 1.03, 1.03);
    transform: scale3d(1.03, 1.03, 1.03);
  }

  80% {
    -webkit-transform: scale3d(0.97, 0.97, 0.97);
    transform: scale3d(0.97, 0.97, 0.97);
  }

  to {
    opacity: 1;
    -webkit-transform: scale3d(1, 1, 1);
    transform: scale3d(1, 1, 1);
  }
`;

export const pulsate = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`;

export const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

export const bigPulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
`;

/**
 * The duration of the sidebar appearing animation in ms
 */
export const sidebarAppearDuration = 600;
