import styled from "styled-components";
import { depths, s } from "@shared/styles";

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${s("backdrop")};
  z-index: ${depths.overlay};
  transition: opacity 50ms ease-in-out;
  opacity: 0;

  &[data-state="open"] {
    opacity: 1;
  }
`;
