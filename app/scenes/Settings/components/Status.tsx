import Text from "@shared/components/Text";
import { s } from "@shared/styles";
import styled, { css } from "styled-components";

type StatusColor = "accent" | "warning" | "danger" | "textTertiary" | "success";

export const Status = styled(Text).attrs({
  type: "secondary",
  size: "small",
  as: "span",
})<{ $color?: StatusColor }>`
  display: inline-flex;
  align-items: center;

  &::after {
    content: "";
    display: inline-block;
    width: 17px;
    height: 17px;

    ${(props) => css`
      background: radial-gradient(
        circle at center,
        ${s(props.$color ?? "accent")} 0 33%,
        transparent 33%
      );
    `}
    border-radius: 50%;
  }
`;
