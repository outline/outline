import { createGlobalStyle } from "styled-components";
import styledNormalize from "styled-normalize";
import { breakpoints, depths, s } from ".";

type Props = {
  staticHTML?: boolean;
  useCursorPointer?: boolean;
};

export default createGlobalStyle<Props>`
  ${styledNormalize}

  * {
    box-sizing: border-box;
  }

  html,
  body {
    width: 100%;
    ${(props) => (props.staticHTML ? "" : "height: 100%;")}
    margin: 0;
    padding: 0;
    print-color-adjust: exact;
    --pointer: ${(props) => (props.useCursorPointer ? "pointer" : "default")};
    overscroll-behavior-x: none;

    @media print {
      background: none !important;
    }
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
    font-size: 16px;
    line-height: 1.5;
    color: ${s("text")};
    overscroll-behavior-y: none;
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
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
    line-height: 1.25;
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
`;
