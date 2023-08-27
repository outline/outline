import styled from "styled-components";
import Button from "~/components/Button";
import { hover } from "~/styles";
import Flex from "../Flex";

export const EmojiButton = styled(Button)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;

  &: ${hover},
  &:active,
  &[aria-expanded= "true"] {
    opacity: 1 !important;
  }
`;

export const Emoji = styled(Flex)<{ size?: number }>`
  line-height: 1.6;
  ${(props) => (props.size ? `font-size: ${props.size}px` : "")}
`;
