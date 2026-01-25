import { createGlobalStyle } from "styled-components";
import styledNormalize from "styled-normalize";
import { breakpoints, depths, s } from ".";
import { EditorStyleHelper } from "../editor/styles/EditorStyleHelper";

type Props = {
  staticHTML?: boolean;
  useCursorPointer?: boolean;
};

export default createGlobalStyle<Props>`
  ${styledNormalize}

  * {
    box-sizing: border-box;
  }

  html {
    --line-height-body: 1.5;
    --font-size-body: 16px;
  }

  html,
  body {
    width: 100%;
    ${(props) => (props.staticHTML ? "" : "height: 100%;")}
    margin: 0;
    padding: 0;
    print-color-adjust: exact;
    --pointer: ${(props) => (props.useCursorPointer ? "pointer" : "default")};
    --scrollbar-width: calc(100vw - 100cqw);
    overscroll-behavior-x: none;

    @media print {
      background: none !important;
    }

    --line-height-p: var(--line-height-body);
    --line-height-h: 1.25;
  }

  body,
  button,
  input,
  optgroup,
  select,
  textarea {
    font-family: ${s("fontFamily")};
  }

  body {
    font-size: var(--font-size-body);
    line-height: var(--line-height-body);
    color: ${s("text")};
    overscroll-behavior-y: none;
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;

    width: 100vw;
    overflow-x: hidden;
    padding-right: calc(0 - var(--removed-body-scroll-bar-size)) !important;
  }

  @media (min-width: ${breakpoints.tablet}px) {
    html,
    body {
      min-height: ${(props) => (props.staticHTML ? "0" : "100vh")};
    }
  }

  @media (min-width: ${breakpoints.tablet}px) and (display-mode: standalone) {
    body:after {
      content: "";
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: ${(props) => props.theme.titleBarDivider};
      z-index: ${depths.titleBarDivider};
    }
  }

  a {
    color: ${(props) => props.theme.link};
    text-decoration: none;
    cursor: pointer;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-weight: 500;
    line-height: var(--line-height-h);
    margin-top: 1em;
    margin-bottom: 0.5em;
  }
  h1 { font-size: 36px; }
  h2 { font-size: 26px; }
  h3 { font-size: 20px; }
  h4 { font-size: 18px; }
  h5 { font-size: 16px; }

  p,
  dl,
  ol,
  ul,
  pre,
  blockquote {
    margin-top: 1em;
    margin-bottom: 1em;
  }

  hr {
    border: 0;
    height: 0;
    border-top: 1px solid ${s("divider")};
  }

  :focus-visible {
    outline-color: ${s("accent")};
    outline-offset: -1px;
    outline-width: initial;
  }

  :root {
    --sat: env(safe-area-inset-top);
    --sar: env(safe-area-inset-right);
    --sab: env(safe-area-inset-bottom);
    --sal: env(safe-area-inset-left);
  }

  /* Mermaid.js injects these into the root of the page. It's very annoying, but we have to deal with it or they affect layout */
  [id^="doffscreen-mermaid"] {
      position: absolute !important;
      left: -9999px !important;
      top: -9999px !important;
  }

  /* Table row/column drag and drop cursor */
  &.${EditorStyleHelper.tableDragging},
  &.${EditorStyleHelper.tableDragging} *,
  &.${EditorStyleHelper.tableDragging} *::before,
  &.${EditorStyleHelper.tableDragging} *::after {
    cursor: grabbing !important;
  }
`;
