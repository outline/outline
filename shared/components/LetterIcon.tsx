import * as React from "react";
import styled from "styled-components";
import { s } from "../styles";
import Squircle from "./Squircle";

type Props = {
  /** The width and height of the icon, including standard padding. */
  size?: number;
  children: React.ReactNode;
};

/**
 * A squircle shaped icon with a letter inside, used for collections.
 */
const LetterIcon = ({ children, size = 24, ...rest }: Props) => (
  <LetterIconWrapper $size={size}>
    <Squircle size={Math.round(size * 0.66)} {...rest}>
      {children ?? "?"}
    </Squircle>
  </LetterIconWrapper>
);

const LetterIconWrapper = styled.div<{ $size: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;

  font-weight: 700;
  font-size: ${({ $size }) => $size / 2}px;
  color: ${s("background")};
`;

export default LetterIcon;
