import styled from "styled-components";

export const CustomEmoji = styled.img<{ size?: number }>`
  width: ${(props) => (props.size ? `${props.size}px` : "16px")};
  height: ${(props) => (props.size ? `${props.size}px` : "16px")};
  object-fit: contain;
`;
