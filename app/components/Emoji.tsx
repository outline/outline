import styled from "styled-components";
import { s } from "@shared/styles";

type Props = {
  width?: number | string;
  height?: number | string;
  size?: number;
};

export const Emoji = styled.span<Props>`
  font-family: ${s("fontFamilyEmoji")};
  width: ${({ width }) =>
    typeof width === "string" ? width : width ? `${width}px` : "auto"};
  height: ${({ height }) =>
    typeof height === "string" ? height : height ? `${height}px` : "auto"};
  font-size: ${({ size }) => size && `${size}px`};
`;
