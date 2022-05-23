import * as React from "react";
import styled from "styled-components";
import { depths } from "@shared/styles";
import { id } from "~/components/SkipNavContent";

export default function SkipNavLink() {
  return <Anchor href={`#${id}`}>Skip navigation</Anchor>;
}

const Anchor = styled.a`
  border: 0;
  clip: rect(0 0 0 0);
  height: 1px;
  width: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  position: absolute;
  z-index: 1;

  &:focus {
    padding: 1rem;
    position: fixed;
    top: 12px;
    left: 12px;
    background: ${(props) => props.theme.background};
    color: ${(props) => props.theme.text};
    outline-color: ${(props) => props.theme.primary};
    z-index: ${depths.popover};
    width: auto;
    height: auto;
    clip: auto;
  }
`;
