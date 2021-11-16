import { createGlobalStyle } from "styled-components";
import styledNormalize from "styled-normalize";

export default createGlobalStyle`
  ${styledNormalize}

  * {
    box-sizing: border-box;
  }

  html,
  body {
    width: 100%;
    min-height: 100vh;
    margin: 0;
    padding: 0;
  }

  body,
  button,
  input,
  optgroup,
  select,
  textarea {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  body {
    font-size: 16px;
    line-height: 1.5;
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'text' does not exist on type 'DefaultThe... Remove this comment to see the full error message
    color: ${(props) => props.theme.text};
    overscroll-behavior-y: none;
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  @media (min-width: ${(props) =>
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'breakpoints' does not exist on type 'Def... Remove this comment to see the full error message
    props.theme.breakpoints.tablet}px) and (display-mode: standalone) {
    body:after {
      content: "";
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'titleBarDivider' does not exist on type ... Remove this comment to see the full error message
      background: ${(props) => props.theme.titleBarDivider};
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'depths' does not exist on type 'DefaultT... Remove this comment to see the full error message
      z-index: ${(props) => props.theme.depths.titleBarDivider};
    }
  }

  a {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'link' does not exist on type 'DefaultThe... Remove this comment to see the full error message
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
  h1 { font-size: 2.25em; }
  h2 { font-size: 1.5em; }
  h3 { font-size: 1.25em; }
  h4 { font-size: 1em; }
  h5 { font-size: 0.875em; }
  h6 { font-size: 0.75em; }

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
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'divider' does not exist on type 'Default... Remove this comment to see the full error message
    border-top: 1px solid ${(props) => props.theme.divider};
  }

  .js-focus-visible :focus:not(.focus-visible) {
    outline: none;
  }

  .js-focus-visible .focus-visible {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'primary' does not exist on type 'Default... Remove this comment to see the full error message
    outline-color: ${(props) => props.theme.primary};
  }
`;
