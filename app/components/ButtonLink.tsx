import * as React from "react";
import { SyntheticEvent } from "react";
import styled from "styled-components";

type Props = {
  onClick: (ev: SyntheticEvent) => void;
  children: React.ReactNode;
};

const ButtonLink = styled.button<Props>`
  margin: 0;
  padding: 0;
  border: 0;
  color: ${(props) => props.theme.link};
  line-height: inherit;
  background: none;
  text-decoration: none;
  cursor: pointer;
`;

export default ButtonLink;
