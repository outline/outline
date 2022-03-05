import * as React from "react";
import styled from "styled-components";

export default function Spinner(props: React.HTMLAttributes<HTMLOrSVGElement>) {
  return (
    <SVG
      width="16px"
      height="16px"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Circle
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        cx="8"
        cy="8"
        r="6"
      ></Circle>
    </SVG>
  );
}

const SVG = styled.svg`
  @keyframes rotator {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(270deg);
    }
  }

  animation: rotator 1.4s linear infinite;
  margin: 4px;
`;

const Circle = styled.circle`
  @keyframes dash {
    0% {
      stroke-dashoffset: 47;
    }
    50% {
      stroke-dashoffset: 11;
      transform: rotate(135deg);
    }
    100% {
      stroke-dashoffset: 47;
      transform: rotate(450deg);
    }
  }

  stroke: ${(props) => props.theme.textSecondary};
  stroke-dasharray: 46;
  stroke-dashoffset: 0;
  transform-origin: center;
  animation: dash 1.4s ease-in-out infinite;
`;
