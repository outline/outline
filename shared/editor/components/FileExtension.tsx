import { AttachmentIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { s } from "../../styles";
import { stringToColor } from "../../utils/color";

type Props = {
  /** The title of the file */
  title?: string;
  /** The size of the icon */
  size?: number;
};

export default function FileExtension(props: Props) {
  const parts = (props.title ?? "Unknown").split(".");
  const extension = parts.length > 1 ? parts.pop() : undefined;

  return (
    <Icon
      style={{ background: stringToColor(extension || "") }}
      $size={props.size || 28}
    >
      {extension ? <span>{extension?.slice(0, 4)}</span> : <AttachmentIcon />}
    </Icon>
  );
}

const Icon = styled.span<{ $size: number }>`
  font-family: ${s("fontFamilyMono")};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  text-transform: uppercase;
  color: white;
  text-align: center;
  border-radius: 4px;

  min-width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
`;
