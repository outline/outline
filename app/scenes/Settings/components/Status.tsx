import Text from "@shared/components/Text";
import { s } from "@shared/styles";
import styled from "styled-components";

export const Status = styled(Text).attrs({
  type: "secondary",
  size: "small",
  as: "span",
})`
  display: inline-flex;
  align-items: center;

  &::after {
    content: "";
    display: inline-block;
    width: 17px;
    height: 17px;

    background: radial-gradient(
      circle at center,
      ${s("accent")} 0 33%,
      transparent 33%
    );
    border-radius: 50%;
  }
`;
