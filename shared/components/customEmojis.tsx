import { s } from "../styles";
import styled from "styled-components";

export const EmojiImage = styled.img`
  width: 24px;
  height: 24px;
  object-fit: contain;
`;

export const EmojiPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: monospace;
  font-size: 14px;
  color: ${s("textSecondary")};
`;
