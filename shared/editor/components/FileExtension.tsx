import * as React from "react";
import styled from "styled-components";
import { stringToColor } from "../../utils/color";

type Props = {
  extension: string;
  size?: number;
};

export default function FileExtension(props: Props) {
  return (
    <Icon
      style={{ background: stringToColor(props.extension) }}
      $size={props.size || 28}
    >
      <span>{props.extension}</span>
    </Icon>
  );
}

const Icon = styled.span<{ $size: number }>`
  font-family: ${(props) => props.theme.fontFamilyMono};
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
