import { transparentize } from "polished";
import { createGlobalStyle } from "styled-components";
import { s } from "../../../styles";

export default createGlobalStyle`
  [data-rmiz] {
    position: relative;
  }
  [data-rmiz-content="found"] img,
  [data-rmiz-content="found"] svg,
  [data-rmiz-content="found"] [role="img"],
  [data-rmiz-content="found"] [data-zoom] {
    cursor: zoom-in;
  }
  [data-rmiz-modal]::backdrop {
    display: none;
  }
  [data-rmiz-modal][open] {
    position: fixed;
    width: 100vw;
    width: 100svw;
    height: 100vh;
    height: 100svh;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    overflow: hidden;
  }
  [data-rmiz-modal-overlay] {
    position: absolute;
    inset: 0;
    transition: background-color 0.3s;
  }
  [data-rmiz-modal-overlay="hidden"] {
    background-color: ${(props) => transparentize(1, props.theme.background)};
  }
  [data-rmiz-modal-overlay="visible"] {
    background-color: ${s("background")};
  }
  [data-rmiz-modal-content] {
    position: relative;
    width: 100%;
    height: 100%;
  }
  [data-rmiz-modal-img] {
    position: absolute;
    cursor: zoom-out;
    image-rendering: high-quality;
    transform-origin: top left;
    transition: transform 0.3s;
  }
  @media (prefers-reduced-motion: reduce) {
    [data-rmiz-modal-overlay],
    [data-rmiz-modal-img] {
      transition-duration: 0.01ms !important;
    }
  }
`;
