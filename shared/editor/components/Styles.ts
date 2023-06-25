/* eslint-disable no-irregular-whitespace */
import { darken, lighten, transparentize } from "polished";
import styled, { DefaultTheme, css } from "styled-components";

export type Props = {
  rtl: boolean;
  readOnly?: boolean;
  readOnlyWriteCheckboxes?: boolean;
  editorStyle?: React.CSSProperties;
  grow?: boolean;
  theme: DefaultTheme;
};

const codeMarkCursor = () => css`
  /* Based on https://github.com/curvenote/editor/blob/main/packages/prosemirror-codemark/src/codemark.css */
  .no-cursor {
    caret-color: transparent;
  }

  div:focus .fake-cursor,
  span:focus .fake-cursor {
    margin-right: -1px;
    border-left-width: 1px;
    border-left-style: solid;
    animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
    position: relative;
    z-index: 1;
  }
`;

const mathStyle = (props: Props) => css`
  /* Based on https://github.com/benrbray/prosemirror-math/blob/master/style/math.css */

  .math-node {
    min-width: 1em;
    min-height: 1em;
    font-size: 0.95em;
    font-family: ${props.theme.fontFamilyMono};
    cursor: auto;
  }

  .math-node.empty-math .math-render::before {
    content: "(empty math)";
    color: ${props.theme.brand.red};
  }

  .math-node .math-render.parse-error::before {
    content: "(math error)";
    color: ${props.theme.brand.red};
    cursor: help;
  }

  .math-node.ProseMirror-selectednode {
    outline: none;
  }

  .math-node .math-src {
    display: none;
    color: ${props.theme.codeStatement};
    tab-size: 4;
  }

  .math-node.ProseMirror-selectednode .math-src {
    display: inline;
  }

  .math-node.ProseMirror-selectednode .math-render {
    display: none;
  }

  math-inline {
    display: inline;
    white-space: nowrap;
  }

  math-inline .math-render {
    display: inline-block;
    font-size: 0.85em;
  }

  math-inline .math-src .ProseMirror {
    display: inline;
    margin: 0px 3px;
  }

  math-block {
    display: block;
  }

  math-block .math-render {
    display: block;
  }

  math-block.ProseMirror-selectednode {
    border-radius: 4px;
    border: 1px solid ${props.theme.codeBorder};
    background: ${props.theme.codeBackground};
    padding: 0.75em 1em;
    font-family: ${props.theme.fontFamilyMono};
    font-size: 90%;
  }

  math-block .math-src .ProseMirror {
    width: 100%;
    display: block;
  }

  math-block .katex-display {
    margin: 0;
  }

  .katex-html *::selection {
    background-color: none !important;
  }

  .math-node.math-select .math-render {
    background-color: #c0c0c0ff;
  }

  math-inline.math-select .math-render {
    padding-top: 2px;
  }
`;

const style = (props: Props) => `
flex-grow: ${props.grow ? 1 : 0};
justify-content: start;
color: ${props.theme.text};
font-family: ${props.theme.fontFamily};
font-weight: ${props.theme.fontWeight};
font-size: 1em;
line-height: 1.6em;
width: 100%;

.mention {
  background: ${props.theme.mentionBackground};
  border-radius: 8px;
  padding-bottom: 2px;
  padding-top: 1px;
  padding-left: 4px;
  padding-right: 4px;
  font-weight: 500;
  font-size: 0.9em;
}

> div {
  background: transparent;
}

& * {
  box-sizing: content-box;
}

.ProseMirror {
  position: relative;
  outline: none;
  word-wrap: break-word;
  white-space: pre-wrap;
  white-space: break-spaces;
  -webkit-font-variant-ligatures: none;
  font-variant-ligatures: none;
  font-feature-settings: "liga" 0; /* the above doesn't seem to work in Edge */
  padding: ${props.editorStyle?.padding ?? "initial"};
  margin: ${props.editorStyle?.margin ?? "initial"};

  & > .ProseMirror-yjs-cursor {
    display: none;
  }

  & > * {
    margin-top: .5em;
    margin-bottom: .5em;

    &:last-child {
      margin-bottom: 0;
    }
  }

  & > :first-child,
  & > button:first-child + * {
    margin-top: 0;
  }

  h2,
  h3,
  h4,
  h5,
  h6 {
    margin-top: 1em;
  }

  h1 {
    margin-top: .75em;
    margin-bottom: 0.25em;
  }

  // all of heading sizes are stepped down one from global styles, except h1
  // which is between h1 and h2
  h1 { font-size: 1.75em; }
  h2 { font-size: 1.25em; }
  h3 { font-size: 1em; }
  h4 { font-size: 0.875em; }
  h5 { font-size: 0.75em; }
  h6 { font-size: 0.75em; }

  .ProseMirror-yjs-cursor {
    position: relative;
    margin-left: -1px;
    margin-right: -1px;
    border-left: 1px solid black;
    border-right: 1px solid black;
    height: 1em;
    word-break: normal;

    &:after {
      content: "";
      display: block;
      position: absolute;
      left: -8px;
      right: -8px;
      top: 0;
      bottom: 0;
    }
    > div {
      opacity: 0;
      transition: opacity 100ms ease-in-out;
      position: absolute;
      top: -1.8em;
      font-size: 13px;
      background-color: rgb(250, 129, 0);
      font-style: normal;
      line-height: normal;
      user-select: none;
      white-space: nowrap;
      color: white;
      padding: 2px 6px;
      font-weight: 500;
      border-radius: 4px;
      pointer-events: none;
      left: -1px;
    }

    &:hover {
      > div {
        opacity: 1;
      }
    }
  }
}

&.show-cursor-names .ProseMirror-yjs-cursor > div {
  opacity: 1;
}

pre {
  white-space: pre-wrap;
}

li {
  position: relative;
}

.image {
  line-height: 0;
  text-align: center;
  max-width: 100%;
  clear: both;
  position: relative;
  z-index: 1;

  img {
    pointer-events: ${props.readOnly ? "initial" : "none"};
    display: inline-block;
    max-width: 100%;
  }

  .ProseMirror-selectednode img {
    pointer-events: initial;
  }
}

.image.placeholder {
  position: relative;
  background: ${props.theme.background};
  margin-bottom: calc(28px + 1.2em);

  img {
    opacity: 0.5;
  }
}

.image-replacement-uploading {
  img {
    opacity: 0.5;
  }
}

.image-right-50 {
  float: right;
  width: 33.3%;
  margin-left: 2em;
  margin-bottom: 1em;
  clear: initial;
}

.image-left-50 {
  float: left;
  width: 33.3%;
  margin-right: 2em;
  margin-bottom: 1em;
  clear: initial;
}

.image-full-width {
  width: initial;
  max-width: 100vw;
  clear: both;
  position: initial;
  ${props.rtl ? `margin-right: var(--offset)` : `margin-left: var(--offset)`};

  img {
    max-width: 100vw;
    max-height: 50vh;
    object-fit: cover;
    object-position: center;
  }
}

.ProseMirror-hideselection *::selection {
  background: transparent;
}
.ProseMirror-hideselection *::-moz-selection {
  background: transparent;
}
.ProseMirror-hideselection {
  caret-color: transparent;
}

.ProseMirror-selectednode {
  outline: 2px solid
    ${props.readOnly ? "transparent" : props.theme.selected};
}

/* Make sure li selections wrap around markers */

li.ProseMirror-selectednode {
  outline: none;
}

li.ProseMirror-selectednode:after {
  content: "";
  position: absolute;
  left: ${props.rtl ? "-2px" : "-32px"};
  right: ${props.rtl ? "-32px" : "-2px"};
  top: -2px;
  bottom: -2px;
  border: 2px solid ${props.theme.selected};
  pointer-events: none;
}

img.ProseMirror-separator {
  display: inline;
  border: none !important;
  margin: 0 !important;
}

// Removes forced paragraph spaces below images, this is needed to images
// being inline nodes that are displayed like blocks
.component-image + img.ProseMirror-separator,
.component-image + img.ProseMirror-separator + br.ProseMirror-trailingBreak {
  display: none;
}

.ProseMirror[contenteditable="false"] {
  .caption {
    pointer-events: none;
  }
  .caption:empty {
    visibility: hidden;
  }
}

h1,
h2,
h3,
h4,
h5,
h6 {
  font-weight: 500;
  cursor: text;

  &:not(.placeholder):before {
    display: ${props.readOnly ? "none" : "inline-block"};
    font-family: ${props.theme.fontFamilyMono};
    color: ${props.theme.textSecondary};
    font-size: 13px;
    line-height: 0;
    margin-${props.rtl ? "right" : "left"}: -24px;
    transition: opacity 150ms ease-in-out;
    opacity: 0;
    width: 24px;
  }

  &:hover,
  &:focus-within {
    .heading-actions {
      opacity: 1;
    }
  }
}

.heading-content {
  &:before {
    content: "​";
    display: inline;
  }
}

.heading-name {
  color: ${props.theme.text};
  pointer-events: none;
  display: block;
  position: relative;
  top: -60px;
  visibility: hidden;

  &:hover {
    text-decoration: none;
  }
}

.heading-name:first-child,
.heading-name:first-child + .ProseMirror-yjs-cursor {
  & + h1,
  & + h2,
  & + h3,
  & + h4 {
    margin-top: 0;
  }
}

a:first-child {
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin-top: 0;
  }
}

h1:not(.placeholder):before {
  content: "H1";
}
h2:not(.placeholder):before {
  content: "H2";
}
h3:not(.placeholder):before {
  content: "H3";
}
h4:not(.placeholder):before {
  content: "H4";
}
h5:not(.placeholder):before {
  content: "H5";
}
h6:not(.placeholder):before {
  content: "H6";
}

.ProseMirror[contenteditable="true"]:focus-within,
.ProseMirror-focused {
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    &:not(.placeholder):before {
      opacity: 1;
    }
  }
}

.with-emoji {
  margin-${props.rtl ? "right" : "left"}: -1em;
}

.heading-anchor,
.heading-fold {
  display: inline-block;
  color: ${props.theme.text};
  opacity: .75;
  cursor: var(--pointer);
  background: none;
  outline: none;
  border: 0;
  margin: 0;
  padding: 0;
  text-align: left;
  font-family: ${props.theme.fontFamilyMono};
  font-size: 14px;
  line-height: 0;
  width: 12px;
  height: 24px;

  &:focus,
  &:hover {
    opacity: 1;
  }
}

.heading-anchor {
  box-sizing: border-box;
}

.heading-actions {
  opacity: 0;
  background: ${props.theme.background};
  margin-${props.rtl ? "right" : "left"}: -26px;
  flex-direction: ${props.rtl ? "row-reverse" : "row"};
  display: inline-flex;
  position: relative;
  top: -2px;
  width: 26px;
  height: 24px;

  &.collapsed {
    opacity: 1;
  }

  &.collapsed .heading-anchor {
    opacity: 0;
  }

  &.collapsed .heading-fold {
    opacity: 1;
  }
}

h1,
h2,
h3,
h4,
h5,
h6 {
  &:hover {
    .heading-anchor {
      opacity: 0.75 !important;
    }
    .heading-anchor:hover {
      opacity: 1 !important;
    }
  }
}

.heading-fold {
  display: inline-block;
  transform-origin: center;
  padding: 0;

  &.collapsed {
    svg {
      transform: rotate(${props.rtl ? "90deg" : "-90deg"});
      pointer-events: none;
    }
    transition-delay: 0.1s;
    opacity: 1;
  }
}

.placeholder:before {
  display: block;
  opacity: 0;
  transition: opacity 150ms ease-in-out;
  content: ${props.readOnly ? "" : "attr(data-empty-text)"};
  pointer-events: none;
  height: 0;
  color: ${props.theme.placeholder};
}

/** Show the placeholder if focused or the first visible item nth(2) accounts for block insert trigger */
.ProseMirror-focused .placeholder:before,
.placeholder:nth-child(1):before,
.placeholder:nth-child(2):before {
  opacity: 1;
}

.comment-marker {
  border-bottom: 2px solid ${transparentize(0.5, props.theme.brand.marine)};
  transition: background 100ms ease-in-out;
  border-radius: 2px;

  &:hover {
    ${props.readOnly ? "cursor: var(--pointer);" : ""}
    background: ${transparentize(0.5, props.theme.brand.marine)};
  }
}

.notice-block {
  display: flex;
  align-items: center;
  background: ${transparentize(0.9, props.theme.noticeInfoBackground)};
  border-left: 4px solid ${props.theme.noticeInfoBackground};
  color: ${props.theme.noticeInfoText};
  border-radius: 4px;
  padding: 8px 10px 8px 8px;
  margin: 8px 0;

  a {
    color: ${props.theme.noticeInfoText};
  }

  a:not(.heading-name) {
    text-decoration: underline;
  }

  p:first-child {
    margin-top: 0;
  }

  p:last-child {
    margin-bottom: 0;
  }
}

.notice-block .content {
  flex-grow: 1;
  min-width: 0;
}

.notice-block .icon {
  width: 24px;
  height: 24px;
  align-self: flex-start;
  margin-${props.rtl ? "left" : "right"}: 4px;
  color: ${props.theme.noticeInfoBackground};
}

.notice-block.tip {
  background: ${transparentize(0.9, props.theme.noticeTipBackground)};
  border-left: 4px solid ${props.theme.noticeTipBackground};
  color: ${props.theme.noticeTipText};

  .icon {
    color: ${props.theme.noticeTipBackground};
  }

  a {
    color: ${props.theme.noticeTipText};
  }
}

.notice-block.warning {
  background: ${transparentize(0.9, props.theme.noticeWarningBackground)};
  border-left: 4px solid ${props.theme.noticeWarningBackground};
  color: ${props.theme.noticeWarningText};

  .icon {
    color: ${props.theme.noticeWarningBackground};
  }

  a {
    color: ${props.theme.noticeWarningText};
  }
}

.notice-block.success {
  background: ${transparentize(0.9, props.theme.noticeSuccessBackground)};
  border-left: 4px solid ${props.theme.noticeSuccessBackground};
  color: ${props.theme.noticeSuccessText};

  .icon {
    color: ${props.theme.noticeSuccessBackground};
  }

  a {
    color: ${props.theme.noticeSuccessText};
  }
}

blockquote {
  margin: 0;
  padding: 8px 10px 8px 1.5em;
  font-style: italic;
  overflow: hidden;
  position: relative;

  &:before {
    content: "";
    display: inline-block;
    width: 2px;
    border-radius: 1px;
    position: absolute;
    margin-${props.rtl ? "right" : "left"}: -1.5em;
    top: 0;
    bottom: 0;
    background: ${props.theme.quote};
  }
}

b,
strong {
  font-weight: 600;
}

.template-placeholder {
  color: ${props.theme.placeholder};
  border-bottom: 1px dotted ${props.theme.placeholder};
  border-radius: 2px;
  cursor: text;

  &:hover {
    border-bottom: 1px dotted
      ${props.readOnly ? props.theme.placeholder : props.theme.textSecondary};
  }
}

p {
  margin: 0;
  min-height: 1.6em;
}

.heading-content a,
p a {
  color: ${props.theme.text};
  text-decoration: underline;
  text-decoration-color: ${lighten(0.5, props.theme.text)};
  text-decoration-thickness: 1px;
  text-underline-offset: .15em;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
    text-decoration-color: ${props.theme.text};
    text-decoration-thickness: 1px;
  }
}

a {
  color: ${props.theme.link};
  cursor: pointer;
}

.ProseMirror-focused {
  a {
    cursor: text;
  }
}

a:hover {
  text-decoration: ${props.readOnly ? "underline" : "none"};
}

ul,
ol {
  margin: ${props.rtl ? "0 -26px 0 0.1em" : "0 0.1em 0 -26px"};
  padding: ${props.rtl ? "0 48px 0 0" : "0 0 0 48px"};
}

ol ol {
  list-style: lower-alpha;
}

ol ol ol {
  list-style: lower-roman;
}

ul.checkbox_list {
  padding: 0;
  margin-left: ${props.rtl ? "0" : "-24px"};
  margin-right: ${props.rtl ? "-24px" : "0"};
}

ul li,
ol li {
  position: relative;
  white-space: initial;

  p {
    white-space: pre-wrap;
  }

  > div {
    width: 100%;
  }
}

ul.checkbox_list > li {
  display: flex;
  list-style: none;
  padding-${props.rtl ? "right" : "left"}: 24px;
}

ul.checkbox_list > li.checked > div > p {
  color: ${props.theme.textTertiary};
}

ul li::before,
ol li::before {
  background: url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iOCIgeT0iNyIgd2lkdGg9IjMiIGhlaWdodD0iMiIgcng9IjEiIGZpbGw9IiM0RTVDNkUiLz4KPHJlY3QgeD0iOCIgeT0iMTEiIHdpZHRoPSIzIiBoZWlnaHQ9IjIiIHJ4PSIxIiBmaWxsPSIjNEU1QzZFIi8+CjxyZWN0IHg9IjgiIHk9IjE1IiB3aWR0aD0iMyIgaGVpZ2h0PSIyIiByeD0iMSIgZmlsbD0iIzRFNUM2RSIvPgo8cmVjdCB4PSIxMyIgeT0iNyIgd2lkdGg9IjMiIGhlaWdodD0iMiIgcng9IjEiIGZpbGw9IiM0RTVDNkUiLz4KPHJlY3QgeD0iMTMiIHk9IjExIiB3aWR0aD0iMyIgaGVpZ2h0PSIyIiByeD0iMSIgZmlsbD0iIzRFNUM2RSIvPgo8cmVjdCB4PSIxMyIgeT0iMTUiIHdpZHRoPSIzIiBoZWlnaHQ9IjIiIHJ4PSIxIiBmaWxsPSIjNEU1QzZFIi8+Cjwvc3ZnPgo=") no-repeat;
  background-position: 0 2px;
  content: "";
  display: ${props.readOnly ? "none" : "inline-block"};
  cursor: grab;
  width: 24px;
  height: 24px;
  position: absolute;
  ${props.rtl ? "right" : "left"}: -40px;
  opacity: 0;
  transition: opacity 200ms ease-in-out;
}

ul li[draggable=true]::before,
ol li[draggable=true]::before {
  cursor: grabbing;
}

ul > li.counter-2::before,
ol li.counter-2::before {
  ${props.rtl ? "right" : "left"}: -50px;
}

ul > li.hovering::before,
ol li.hovering::before {
  opacity: 0.5;
}

ul li.ProseMirror-selectednode::after,
ol li.ProseMirror-selectednode::after {
  display: none;
}

ul.checkbox_list > li::before {
  ${props.rtl ? "right" : "left"}: 0;
}

ul.checkbox_list li .checkbox {
  display: inline-block;
  cursor: var(--pointer);
  pointer-events: ${
    props.readOnly && !props.readOnlyWriteCheckboxes ? "none" : "initial"
  };
  opacity: ${props.readOnly && !props.readOnlyWriteCheckboxes ? 0.75 : 1};
  margin: ${props.rtl ? "0 0 0 0.5em" : "0 0.5em 0 0"};
  width: 14px;
  height: 14px;
  position: relative;
  top: 1px;
  transition: transform 100ms ease-in-out;
  opacity: .8;

  background-image: ${`url("data:image/svg+xml,%3Csvg width='14' height='14' viewBox='0 0 14 14' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M3 0C1.34315 0 0 1.34315 0 3V11C0 12.6569 1.34315 14 3 14H11C12.6569 14 14 12.6569 14 11V3C14 1.34315 12.6569 0 11 0H3ZM3 2C2.44772 2 2 2.44772 2 3V11C2 11.5523 2.44772 12 3 12H11C11.5523 12 12 11.5523 12 11V3C12 2.44772 11.5523 2 11 2H3Z' fill='${props.theme.text.replace(
    "#",
    "%23"
  )}' /%3E%3C/svg%3E%0A");`}

  &[aria-checked=true] {
    opacity: 1;
    background-image: ${`url(
        "data:image/svg+xml,%3Csvg width='14' height='14' viewBox='0 0 14 14' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M3 0C1.34315 0 0 1.34315 0 3V11C0 12.6569 1.34315 14 3 14H11C12.6569 14 14 12.6569 14 11V3C14 1.34315 12.6569 0 11 0H3ZM4.26825 5.85982L5.95873 7.88839L9.70003 2.9C10.0314 2.45817 10.6582 2.36863 11.1 2.7C11.5419 3.03137 11.6314 3.65817 11.3 4.1L6.80002 10.1C6.41275 10.6164 5.64501 10.636 5.2318 10.1402L2.7318 7.14018C2.37824 6.71591 2.43556 6.08534 2.85984 5.73178C3.28412 5.37821 3.91468 5.43554 4.26825 5.85982Z' fill='${props.theme.accent.replace(
          "#",
          "%23"
        )}' /%3E%3C/svg%3E%0A"
      )`};
  }

  &:active {
    transform: scale(0.9);
  }
}

li p:first-child {
  margin: 0;
  word-break: break-word;
}

hr {
  position: relative;
  height: 1em;
  border: 0;
}

hr:before {
  content: "";
  display: block;
  position: absolute;
  border-top: 1px solid ${props.theme.horizontalRule};
  top: 0.5em;
  left: 0;
  right: 0;
}

hr.page-break {
  page-break-after: always;
}

hr.page-break:before {
  border-top: 1px dashed ${props.theme.horizontalRule};
}

.math-inline .math-src .ProseMirror,
code {
  border-radius: 4px;
  border: 1px solid ${props.theme.codeBorder};
  background: ${props.theme.codeBackground};
  padding: 3px 4px;
  font-family: ${props.theme.fontFamilyMono};
  font-size: 90%;
}

mark {
  border-radius: 1px;
  color: ${props.theme.textHighlightForeground};
  background: ${props.theme.textHighlight};

  a {
    color: ${props.theme.textHighlightForeground};
  }
}

.external-link {
  cursor: pointer;
  display: inline-block;
  position: relative;
  top: 2px;
  width: 16px;
  height: 16px;
}

.code-actions,
.notice-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  position: absolute;
  z-index: 1;
  top: 8px;
  right: 8px;
}

.notice-actions {
  ${props.rtl ? "left" : "right"}: 8px;
}

.code-block,
.notice-block {
  position: relative;

  select,
  button {
    margin: 0;
    padding: 0;
    border: 0;
    background: ${props.theme.buttonNeutralBackground};
    color: ${props.theme.buttonNeutralText};
    box-shadow: rgba(0, 0, 0, 0.07) 0px 1px 2px, ${
      props.theme.buttonNeutralBorder
    } 0 0 0 1px inset;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
    flex-shrink: 0;
    cursor: var(--pointer);
    user-select: none;
    appearance: none !important;
    padding: 6px 8px;
    display: none;

    &::-moz-focus-inner {
      padding: 0;
      border: 0;
    }

    &:hover:not(:disabled) {
      background-color: ${darken(0.05, props.theme.buttonNeutralBackground)};
      box-shadow: rgba(0, 0, 0, 0.07) 0px 1px 2px, ${
        props.theme.buttonNeutralBorder
      } 0 0 0 1px inset;
    }
  }

  select {
    background-image: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path fill-rule="evenodd" clip-rule="evenodd" d="M9.03087 9C8.20119 9 7.73238 9.95209 8.23824 10.6097L11.2074 14.4696C11.6077 14.99 12.3923 14.99 12.7926 14.4696L15.7618 10.6097C16.2676 9.95209 15.7988 9 14.9691 9L9.03087 9Z" fill="currentColor"/> </svg>');
    background-repeat: no-repeat;
    background-position: center right;
    padding-right: 20px;
  }

  &:focus-within,
  &:hover {
    select {
      display: ${props.readOnly ? "none" : "inline"};
    }

    button {
      display: inline;
    }
  }

  select:focus,
  select:active,
  button:focus,
  button:active {
    display: inline;
  }

  button.show-source-button {
    display: none;
  }
  button.show-diagram-button {
    display: inline;
  }

  &.code-hidden {
    button,
    select,
    button.show-diagram-button {
      display: none;
    }

    button.show-source-button {
      display: inline;
    }

    pre {
      display: none;
    }
  }
}

.code-block.with-line-numbers {
  pre {
    padding-left: calc(var(--line-number-gutter-width, 0) * 1em + 1.5em);
  }

  &:after {
    content: attr(data-line-numbers);
    position: absolute;
    padding-left: 1em;
    left: 0;
    top: calc(1px + 0.75em);
    width: calc(var(--line-number-gutter-width,0) * 1em + .25em);
    word-break: break-all;
    white-space: break-spaces;
    font-family: ${props.theme.fontFamilyMono};
    font-size: 13px;
    line-height: 1.4em;
    color: ${props.theme.textTertiary};
    background: ${props.theme.codeBackground};
    text-align: right;
    font-variant-numeric: tabular-nums;
    user-select: none;
  }
}

.mermaid-diagram-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props.theme.codeBackground};
  border-radius: 6px;
  border: 1px solid ${props.theme.codeBorder};
  padding: 8px;
  user-select: none;
  cursor: default;

  * {
    font-family: ${props.theme.fontFamily};
  }

  &.diagram-hidden {
    display: none;
  }
}

pre {
  display: block;
  overflow-x: auto;
  padding: 0.75em 1em;
  line-height: 1.4em;
  position: relative;
  background: ${props.theme.codeBackground};
  border-radius: 4px;
  border: 1px solid ${props.theme.codeBorder};
  margin: .5em 0;

  -webkit-font-smoothing: initial;
  font-family: ${props.theme.fontFamilyMono};
  font-size: 13px;
  direction: ltr;
  text-align: left;
  white-space: pre;
  word-spacing: normal;
  word-break: normal;
  -moz-tab-size: 4;
  -o-tab-size: 4;
  tab-size: 4;
  -webkit-hyphens: none;
  -moz-hyphens: none;
  -ms-hyphens: none;
  hyphens: none;
  color: ${props.theme.code};

  code {
    font-size: 13px;
    background: none;
    padding: 0;
    border: 0;
  }
}

.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
  color: ${props.theme.codeComment};
}

.token.punctuation {
  color: ${props.theme.codePunctuation};
}

.token.namespace {
  opacity: 0.7;
}

.token.operator,
.token.boolean,
.token.number {
  color: ${props.theme.codeNumber};
}

.token.property {
  color: ${props.theme.codeProperty};
}

.token.tag {
  color: ${props.theme.codeTag};
}

.token.string {
  color: ${props.theme.codeString};
}

.token.selector {
  color: ${props.theme.codeSelector};
}

.token.attr-name {
  color: ${props.theme.codeAttr};
}

.token.entity,
.token.url,
.language-css .token.string,
.style .token.string {
  color: ${props.theme.codeEntity};
}

.token.attr-value,
.token.keyword,
.token.control,
.token.directive,
.token.unit {
  color: ${props.theme.codeKeyword};
}

.token.function {
  color: ${props.theme.codeFunction};
}

.token.statement,
.token.regex,
.token.atrule {
  color: ${props.theme.codeStatement};
}

.token.placeholder,
.token.variable {
  color: ${props.theme.codePlaceholder};
}

.token.deleted {
  text-decoration: line-through;
}

.token.inserted {
  border-bottom: 1px dotted ${props.theme.codeInserted};
  text-decoration: none;
}

.token.italic {
  font-style: italic;
}

.token.important,
.token.bold {
  font-weight: bold;
}

.token.important {
  color: ${props.theme.codeImportant};
}

.token.entity {
  cursor: help;
}

table {
  width: 100%;
  border-collapse: collapse;
  border-radius: 4px;
  margin-top: 1em;
  box-sizing: border-box;

  * {
    box-sizing: border-box;
  }

  tr {
    position: relative;
    border-bottom: 1px solid ${props.theme.tableDivider};
  }

  th {
    background: transparent;
  }

  td,
  th {
    position: relative;
    vertical-align: top;
    border: 1px solid ${props.theme.tableDivider};
    position: relative;
    padding: 4px 8px;
    text-align: ${props.rtl ? "right" : "left"};
    min-width: 100px;
  }

  td .component-embed {
    padding: 4px 0;
  }

  .selectedCell {
    background: ${
      props.readOnly ? "inherit" : props.theme.tableSelectedBackground
    };

    /* fixes Firefox background color painting over border:
     * https://bugzilla.mozilla.org/show_bug.cgi?id=688556 */
    background-clip: padding-box;
  }

  .grip-column {
    /* usage of ::after for all of the table grips works around a bug in
     * prosemirror-tables that causes Safari to hang when selecting a cell
     * in an empty table:
     * https://github.com/ProseMirror/prosemirror/issues/947 */
    &::after {
      content: "";
      cursor: var(--pointer);
      position: absolute;
      top: -16px;
      ${props.rtl ? "right" : "left"}: 0;
      width: 100%;
      height: 12px;
      background: ${props.theme.tableDivider};
      border-bottom: 3px solid ${props.theme.background};
      display: ${props.readOnly ? "none" : "block"};
    }

    &:hover::after {
      background: ${props.theme.text};
    }
    &.first::after {
      border-top-${props.rtl ? "right" : "left"}-radius: 3px;
    }
    &.last::after {
      border-top-${props.rtl ? "left" : "right"}-radius: 3px;
    }
    &.selected::after {
      background: ${props.theme.tableSelected};
    }
  }

  .grip-row {
    &::after {
      content: "";
      cursor: var(--pointer);
      position: absolute;
      ${props.rtl ? "right" : "left"}: -16px;
      top: 0;
      height: 100%;
      width: 12px;
      background: ${props.theme.tableDivider};
      border-${props.rtl ? "left" : "right"}: 3px solid;
      border-color: ${props.theme.background};
      display: ${props.readOnly ? "none" : "block"};
    }

    &:hover::after {
      background: ${props.theme.text};
    }
    &.first::after {
      border-top-${props.rtl ? "right" : "left"}-radius: 3px;
    }
    &.last::after {
      border-bottom-${props.rtl ? "right" : "left"}-radius: 3px;
    }
    &.selected::after {
      background: ${props.theme.tableSelected};
    }
  }

  .grip-table {
    &::after {
      content: "";
      cursor: var(--pointer);
      background: ${props.theme.tableDivider};
      width: 13px;
      height: 13px;
      border-radius: 13px;
      border: 2px solid ${props.theme.background};
      position: absolute;
      top: -18px;
      ${props.rtl ? "right" : "left"}: -18px;
      display: ${props.readOnly ? "none" : "block"};
    }

    &:hover::after {
      background: ${props.theme.text};
    }
    &.selected::after {
      background: ${props.theme.tableSelected};
    }
  }
}

.scrollable-wrapper {
  position: relative;
  margin: 0.5em 0px;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;

  &:hover {
    scrollbar-color: ${props.theme.scrollbarThumb} ${
  props.theme.scrollbarBackground
};
  }

  & ::-webkit-scrollbar {
    height: 14px;
    background-color: transparent;
  }

  &:hover ::-webkit-scrollbar {
    background-color: ${props.theme.scrollbarBackground};
  }

  & ::-webkit-scrollbar-thumb {
    background-color: transparent;
    border: 3px solid transparent;
    border-radius: 7px;
  }

  &:hover ::-webkit-scrollbar-thumb {
    background-color: ${props.theme.scrollbarThumb};
    border-color: ${props.theme.scrollbarBackground};
  }
}

.scrollable {
  overflow-y: hidden;
  overflow-x: auto;
  padding-${props.rtl ? "right" : "left"}: 1em;
  margin-${props.rtl ? "right" : "left"}: -1em;
  border-${props.rtl ? "right" : "left"}: 1px solid transparent;
  border-${props.rtl ? "left" : "right"}: 1px solid transparent;
  transition: border 250ms ease-in-out 0s;
}

.scrollable-shadow {
  position: absolute;
  top: 0;
  bottom: 0;
  ${props.rtl ? "right" : "left"}: -1em;
  width: 16px;
  transition: box-shadow 250ms ease-in-out;
  border: 0px solid transparent;
  border-${props.rtl ? "right" : "left"}-width: 1em;
  pointer-events: none;

  &.left {
    box-shadow: 16px 0 16px -16px inset rgba(0, 0, 0, 0.25);
    border-left: 1em solid ${props.theme.background};
  }

  &.right {
    right: 0;
    left: auto;
    box-shadow: -16px 0 16px -16px inset rgba(0, 0, 0, 0.25);
  }
}

.block-menu-trigger {
  opacity: 0;
  pointer-events: none;
  display: ${props.readOnly ? "none" : "inline"};
  width: 24px;
  height: 24px;
  color: ${props.theme.textSecondary};
  background: none;
  position: absolute;
  transition: color 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275),
    opacity 150ms ease-in-out;
  outline: none;
  border: 0;
  padding: 0;
  margin-top: 1px;
  margin-${props.rtl ? "right" : "left"}: -28px;
  border-radius: 4px;

  &:hover,
  &:focus {
    cursor: var(--pointer);
    color: ${props.theme.text};
    background: ${props.theme.secondaryBackground};
  }
}

.ProseMirror[contenteditable="true"]:focus-within,
.ProseMirror-focused .block-menu-trigger,
.block-menu-trigger:active,
.block-menu-trigger:focus {
  opacity: 1;
  pointer-events: initial;
}

.ProseMirror-gapcursor {
  display: none;
  pointer-events: none;
  position: absolute;
}

.ProseMirror-gapcursor:after {
  content: "";
  display: block;
  position: absolute;
  top: -2px;
  width: 20px;
  border-top: 1px solid ${props.theme.cursor};
  animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
}

.folded-content {
  display: none;
}

@keyframes ProseMirror-cursor-blink {
  to {
    visibility: hidden;
  }
}

.ProseMirror-focused .ProseMirror-gapcursor {
  display: block;
}

del {
  color: ${props.theme.slate};
  text-decoration: strikethrough;
}

ins[data-operation-index] {
  color: ${props.theme.textDiffInserted};
  background-color: ${props.theme.textDiffInsertedBackground};
  text-decoration: none;
}

del[data-operation-index] {
  color: ${props.theme.textDiffDeleted};
  background-color: ${props.theme.textDiffDeletedBackground};
  text-decoration: none;

  img {
    opacity: .5;
  }
}

@media print {
  .placeholder:before,
  .block-menu-trigger,
  .heading-actions,
  button.show-source-button,
  h1:not(.placeholder):before,
  h2:not(.placeholder):before,
  h3:not(.placeholder):before,
  h4:not(.placeholder):before,
  h5:not(.placeholder):before,
  h6:not(.placeholder):before {
    display: none;
  }

  .image {
    page-break-inside: avoid;
  }

  .comment-marker {
    border: 0;
    background: none;
  }

  .page-break {
    opacity: 0;
  }

  pre {
    overflow-x: hidden;
    white-space: pre-wrap;
  }

  em,
  blockquote {
    font-family: "SF Pro Text", ${props.theme.fontFamily};
  }
}
`;

const EditorContainer = styled.div<Props>`
  ${style}
  ${mathStyle}
  ${codeMarkCursor}
`;

export default EditorContainer;
