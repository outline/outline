import styled, { css } from "styled-components";
import { hover, s } from "@shared/styles";

/**
 * A dashed drop target for choosing files, highlighted while a file is dragged
 * over it.
 */
export const DropzoneContainer = styled.div<{
  $isDragActive: boolean;
  $disabled?: boolean;
}>`
  background: ${(props) =>
    props.$isDragActive
      ? props.theme.backgroundSecondary
      : props.theme.background};
  border-radius: 8px;
  border: 1px dashed ${s("divider")};
  padding: 44px 24px;
  text-align: center;
  font-size: 15px;
  cursor: var(--pointer);
  opacity: ${(props) => (props.$disabled ? 0.5 : 1)};

  &: ${hover} {
    background: ${s("backgroundSecondary")};
  }
`;

/** Styles the icon shown inside a dropzone as a colored badge. */
export const dropzoneIcon = css`
  padding: 4px;
  border-radius: 50%;
  background: ${(props) => props.theme.brand.blue};
  color: white;
`;
