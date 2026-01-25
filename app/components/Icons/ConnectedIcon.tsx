import styled from "styled-components";

export const ConnectedIcon = styled.div<{ color?: string }>`
  width: 24px;
  height: 24px;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 8px;
    background-color: ${(props) => props.color ?? props.theme.accent};
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }
`;
