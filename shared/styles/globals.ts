import { createGlobalStyle } from "styled-components";
import styledNormalize from "styled-normalize";
import { breakpoints, depths, s } from ".";
import { EditorStyleHelper } from "../editor/styles/EditorStyleHelper";

type Props = {
  staticHTML?: boolean;
  useCursorPointer?: boolean;
};

const dragHandleIcon =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iOCIgeT0iNyIgd2lkdGg9IjMiIGhlaWdodD0iMiIgcng9IjEiIGZpbGw9IiM0RTVDNkUiLz4KPHJlY3QgeD0iOCIgeT0iMTEiIHdpZHRoPSIzIiBoZWlnaHQ9IjIiIHJ4PSIxIiBmaWxsPSIjNEU1QzZFIi8+CjxyZWN0IHg9IjgiIHk9IjE1IiB3aWR0aD0iMyIgaGVpZ2h0PSIyIiByeD0iMSIgZmlsbD0iIzRFNUM2RSIvPgo8cmVjdCB4PSIxMyIgeT0iNyIgd2lkdGg9IjMiIGhlaWdodD0iMiIgcng9IjEiIGZpbGw9IiM0RTVDNkUiLz4KPHJlY3QgeD0iMTMiIHk9IjExIiB3aWR0aD0iMyIgaGVpZ2h0PSIyIiByeD0iMSIgZmlsbD0iIzRFNUM2RSIvPgo8cmVjdCB4PSIxMyIgeT0iMTUiIHdpZHRoPSIzIiBoZWlnaHQ9IjIiIHJ4PSIxIiBmaWxsPSIjNEU1QzZFIi8+Cjwvc3ZnPgo=";

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

    ${(props) => (props.staticHTML ? "" : "width: 100vw;")}
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

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
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

  /* Image/media resize drag cursor */
  &.${EditorStyleHelper.resizeDragging},
  &.${EditorStyleHelper.resizeDragging} *,
  &.${EditorStyleHelper.resizeDragging} *::before,
  &.${EditorStyleHelper.resizeDragging} *::after {
    cursor: var(--resize-drag-cursor) !important;
  }

  /* prosemirror-dropcursor renders adjacent to the editor (in view.dom.offsetParent), outside
     the styled EditorContainer scope, so this rule has to live globally. */
  .${EditorStyleHelper.dropCursor} {
    border-radius: 9999px;
  }

  /* Block drag handle is appended to document.body, outside the styled
     EditorContainer scope, so its rules have to live globally. */
  .${EditorStyleHelper.blockDragHandle} {
    appearance: none;
    border: 0;
    padding: 0;
    position: fixed;
    width: 24px;
    height: 24px;
    cursor: grab;
    opacity: 0;
    pointer-events: none;
    transition: background-color 150ms ease-in-out;
    background-color: ${s("textTertiary")};
    mask-image: url("${dragHandleIcon}");
    mask-repeat: no-repeat;
    mask-position: 0 2px;
    z-index: 1;

    &:hover {
      background-color: ${s("text")};
    }

    &:active {
      cursor: grabbing;
    }

    &.visible {
      opacity: 1;
      pointer-events: auto;
    }

    &.visible.dragging {
      opacity: 0;
    }
  }

  @media print {
    .${EditorStyleHelper.blockDragHandle} {
      display: none !important;
    }
  }
`;
