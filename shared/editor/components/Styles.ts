/* eslint-disable no-irregular-whitespace */
import { lighten, transparentize } from "polished";
import styled, { DefaultTheme, css, keyframes } from "styled-components";
import { hover } from "../../styles";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { videoStyle } from "./Video";

export type Props = {
  rtl: boolean;
  readOnly?: boolean;
  readOnlyWriteCheckboxes?: boolean;
  staticHTML?: boolean;
  editorStyle?: React.CSSProperties;
  grow?: boolean;
  theme: DefaultTheme;
  userId?: string;
};

export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const pulse = keyframes`
  0% { box-shadow: 0 0 0 1px rgba(255, 213, 0, 0.75) }
  50% { box-shadow: 0 0 0 4px rgba(255, 213, 0, 0.75) }
  100% { box-shadow: 0 0 0 1px rgba(255, 213, 0, 0.75) }
`;

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
    white-space: pre-wrap;
    overflow-x: auto;
    overflow-y: none;
  }

  .math-node.empty-math .math-render::before {
    content: "Empty math";
    color: ${props.theme.placeholder};
    font-size: 14px;
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

  math-block.ProseMirror-selectednode,
  math-block.empty-math {
    border-radius: 4px;
    border: 1px solid ${props.theme.codeBorder};
    background: ${props.theme.codeBackground};
    padding: 0.75em 1em;
    font-family: ${props.theme.fontFamilyMono};
    font-size: 90%;
  }

  math-block.empty-math {
    text-align: center;
  }

  math-block .math-src .ProseMirror {
    width: 100%;
    display: block;
    outline: none;
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

const codeBlockStyle = (props: Props) => css`
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

  .token.function,
  .token.class-name-definition {
    color: ${props.theme.codeFunction};
  }

  .token.class-name {
    color: ${props.theme.codeClassName};
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
`;

const findAndReplaceStyle = () => css`
  .find-result:not(:has(.mention)),
  .find-result .mention {
    background: rgba(255, 213, 0, 0.25);
  }

  .find-result.current-result:not(:has(.mention)),
  .find-result.current-result .mention {
      background: rgba(255, 213, 0, 0.75);
      animation: ${pulse} 150ms 1;
    }
  }
`;

const emailStyle = (props: Props) => css`
  .attachment {
    display: block;
    color: ${props.theme.text} !important;
    box-shadow: 0 0 0 1px ${props.theme.divider};
    white-space: nowrap;
    border-radius: 8px;
    padding: 6px 8px;
  }

  .image > img {
    width: auto;
    height: auto;
  }
`;

const style = (props: Props) => css`
flex-grow: ${props.grow ? 1 : 0};
justify-content: start;
color: ${props.theme.text};
font-family: ${props.theme.fontFamily};
font-weight: ${props.theme.fontWeightRegular};
font-size: 1em;
line-height: -0.011;
width: 100%;

.mention {
  background: ${props.theme.mentionBackground};
  border-radius: 8px;
  padding-top: 1px;
  padding-bottom: 1px;
  padding-left: 4px;
  padding-right: 6px;
  font-weight: 500;
  font-size: 0.9em;
  cursor: default;
  text-decoration: none !important;

  display: inline-flex;
  align-items: center;
  gap: 4px;
  vertical-align: bottom;

  &:${hover} {
    cursor: default;
    background: ${props.theme.mentionHoverBackground};
  }

  &[data-type="user"] {
    gap: 0;
  }

  &.mention-user::before {
    content: "@";
  }

  &.mention-document::before {
    content: "+";
  }
}

> div {
  background: transparent;
}

& * {
  box-sizing: content-box;
}

& > .ProseMirror {
  position: relative;
  outline: none;
  word-wrap: break-word;
  white-space: pre-wrap;
  white-space: break-spaces;
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

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin-top: 1em;
    margin-bottom: 0.25em;
    font-weight: 600;
    cursor: text;

    & + p,
    // accounts for block insert trigger and other widgets between heading and paragraph
    & + .ProseMirror-widget + p {
      margin-top: 0.25em;
    }

    &:not(.placeholder) {
      &::before {
        display: none;
        font-family: ${props.theme.fontFamilyMono};
        color: ${props.theme.textSecondary};
        font-size: 13px;
        font-weight: 500;
        line-height: 0;
        margin-left: -24px;
        transition: opacity 150ms ease-in-out;
        opacity: 0;
        width: 24px;
      }

      &:dir(rtl)::before {
        margin-left: 0;
        margin-right: -24px;
      }
    }

    &:hover,
    &:focus-within {
      .heading-actions {
        opacity: 1;
      }
    }
  }

  // all of heading sizes are stepped down one from global styles, except h1
  // which is between h1 and h2
  h1 { font-size: 28px; }
  h2 { font-size: 22px; }
  h3 { font-size: 18px; }
  h4 { font-size: 16px; }
  h5 { font-size: 15px; }
  h6 { font-size: 15px; }

  .ProseMirror-yjs-selection {
    transition: background-color 500ms ease-in-out;
  }

  .ProseMirror-yjs-cursor {
    position: relative;
    margin-left: -1px;
    margin-right: -1px;
    border-left: 1px solid black;
    border-right: 1px solid black;
    height: 1em;
    word-break: normal;

    &::after {
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

iframe.embed {
  width: 100%;
  height: 400px;
  border: 1px solid ${props.theme.embedBorder};
  border-radius: 6px;
}

.image,
.video {
  line-height: 0;
  text-align: center;
  max-width: 100%;
  clear: both;
  position: relative;
  z-index: 1;

  img,
  video {
    pointer-events: ${props.readOnly ? "initial" : "none"};
    display: inline-block;
    max-width: 100%;
  }

  video {
    pointer-events: initial;
    ${videoStyle}
  }

  .ProseMirror-selectednode img {
    pointer-events: initial;
  }
}

.image.placeholder,
.video.placeholder {
  position: relative;
  background: ${props.theme.background};
  margin-bottom: calc(28px + 1.2em);

  img,
  video {
    opacity: 0.5;
  }

  video {
    border-radius: 8px;
  }
}

.file.placeholder {
  display: flex;
  align-items: center;
  background: ${props.theme.background};
  box-shadow: 0 0 0 1px ${props.theme.divider};
  white-space: nowrap;
  border-radius: 8px;
  padding: 6px 8px;
  max-width: 840px;
  cursor: default;

  margin-top: 0.5em;
  margin-bottom: 0.5em;

  .title,
  .subtitle {
    margin-left: 8px;
  }

  .title {
    font-weight: 600;
    font-size: 14px;
    color:  ${props.theme.text};
  }

  .subtitle {
    font-size: 13px;
    color: ${props.theme.textTertiary};
    line-height: 0;
  }

  span {
    font-family: ${props.theme.fontFamilyMono};
  }
}

.attachment-replacement-uploading {
  .widget {
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
  margin-left: 2em;
  margin-bottom: 1em;
  clear: initial;
}

.image-left-50 {
  float: left;
  margin-right: 2em;
  margin-bottom: 1em;
  clear: initial;
}

.image-full-width {
  width: initial;
  max-width: 100vw;
  clear: both;
  position: initial;
  transform: translateX(calc(50% + var(--container-width) * -0.5));

  img {
    max-width: 100vw;
    max-height: min(450px, 50vh);
    object-fit: cover;
    object-position: center;
  }
}

.${EditorStyleHelper.tableFullWidth} {
  transform: translateX(calc(50% + ${
    EditorStyleHelper.padding
  }px + var(--container-width) * -0.5));

  .${EditorStyleHelper.tableScrollable},
  table {
    width: calc(var(--container-width) - ${EditorStyleHelper.padding * 2}px);
  }

  &.${EditorStyleHelper.tableShadowRight}::after {
    left: calc(var(--container-width) - ${EditorStyleHelper.padding * 3}px);
  }
}

.column-resize-handle {
  ${props.readOnly ? "display: none;" : ""}
  position: absolute;
  right: -1px;
  top: 0;
  bottom: -1px;
  width: 2px;
  z-index: 20;
  background-color: ${props.theme.text};
  pointer-events: none;
}

.resize-cursor {
  ${props.readOnly ? "pointer-events: none;" : ""}
  cursor: ew-resize;
  cursor: col-resize;
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

  @media print {
    outline: none;
  }
}

/* Make sure li selections wrap around markers */

li.ProseMirror-selectednode {
  outline: none;
}

li.ProseMirror-selectednode {
  &::after {
    content: "";
    position: absolute;
    left: -32px;
    right: -2px;
    top: -2px;
    bottom: -2px;
    border: 2px solid ${props.theme.selected};
    pointer-events: none;
  }

  &:dir(rtl)::after {
    left: -2px;
    right: -32px;
  }
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

.${EditorStyleHelper.imageCaption} {
  border: 0;
  display: block;
  font-style: italic;
  font-weight: normal;
  font-size: 13px;
  color: ${props.theme.textSecondary};
  padding: 8px 0 4px;
  line-height: 16px;
  text-align: center;
  min-height: 1em;
  outline: none;
  background: none;
  resize: none;
  user-select: text;
  margin: 0 auto !important;
  max-width: 100vw;
}

.ProseMirror[contenteditable="false"] {
  .${EditorStyleHelper.imageCaption} {
    pointer-events: none;
  }
  .${EditorStyleHelper.imageCaption}:empty {
    visibility: hidden;
  }
}

.heading-content {
  &::before {
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
// Edge case where multiplayer cursor is between start of cell and heading
.heading-name:first-child + .ProseMirror-yjs-cursor,
// Edge case where table grips are between start of cell and heading
.heading-name:first-child + [role=button] + [role=button] {
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

h1:not(.placeholder)::before {
  content: "H1";
}
h2:not(.placeholder)::before {
  content: "H2";
}
h3:not(.placeholder)::before {
  content: "H3";
}
h4:not(.placeholder)::before {
  content: "H4";
}
h5:not(.placeholder)::before {
  content: "H5";
}
h6:not(.placeholder)::before {
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
  text-align: start;
  font-weight: 500;
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
  user-select: none;
  background: ${props.theme.background};
  margin-left: -26px;
  flex-direction: row;
  display: none;
  position: relative;
  top: -2px;
  width: 26px;
  height: 24px;

  &:dir(rtl) {
    margin-left: 0;
    margin-right: -26px;
  }

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

.ProseMirror > {
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    .heading-actions {
      display: inline-flex;
    }
    &:not(.placeholder)::before {
      display: ${props.readOnly ? "none" : "inline-block"};
    }
  }
}

.heading-fold {
  display: inline-block;
  transform-origin: center;
  padding: 0;

  &.collapsed {
    svg {
      transform: rotate(-90deg);
      pointer-events: none;
    }
    transition-delay: 0.1s;
    opacity: 1;
  }

  &:dir(rtl).collapsed svg {
    transform: rotate(90deg);
  }
}

.placeholder::before {
  display: block;
  opacity: 0;
  transition: opacity 150ms ease-in-out;
  content: ${props.readOnly ? "" : "attr(data-empty-text)"};
  pointer-events: none;
  height: 0;
  color: ${props.theme.placeholder};
}

/** Show the placeholder if focused or the first visible item nth(2) accounts for block insert trigger */
.ProseMirror-focused .placeholder::before,
.placeholder:nth-child(1)::before,
.placeholder:nth-child(2)::before {
  opacity: 1;
}

.${EditorStyleHelper.comment} {
  &:not([data-resolved]):not([data-draft]), &[data-draft][data-user-id="${
    props.userId ?? ""
  }"]  {
    border-bottom: 2px solid ${props.theme.commentMarkBackground};
    transition: background 100ms ease-in-out;
    border-radius: 2px;

    &:hover {
      ${props.readOnly ? "cursor: var(--pointer);" : ""}
      background: ${props.theme.commentMarkBackground};
    }
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

.notice-block {
  .icon {
    width: 24px;
    height: 24px;
    align-self: flex-start;
    margin-right: 4px;
    color: ${props.theme.noticeInfoBackground};
  }

  &:dir(rtl) .icon {
    margin-right: 0;
    margin-left: 4px;
  }
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
  overflow: hidden;
  position: relative;

  &::before {
    content: "";
    display: inline-block;
    width: 2px;
    border-radius: 1px;
    position: absolute;
    margin-left: -1.5em;
    top: 0;
    bottom: 0;
    background: ${props.theme.quote};
  }

  &:dir(rtl)::before {
    margin-left: 0;
    margin-right: -1.5em;
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

.heading-content a {
  font-weight: inherit;
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
  margin: 0 0.1em 0 ${props.staticHTML ? "0" : "-26px"};
  padding: 0 0 0 48px;

  &:has(p:dir(rtl)) {
    direction: rtl;
  }

  &:has(p:dir(rtl)),
  &:dir(rtl) {
    margin: 0 ${props.staticHTML ? "0" : "-26px"} 0 0.1em;
    padding: 0 48px 0 0;
  }
}

ol ol {
  list-style: lower-alpha;
}

ol ol ol {
  list-style: lower-roman;
}

ul li,
ol li {
  position: relative;
  white-space: initial;
  text-align: start;

  p {
    white-space: pre-wrap;
  }

  > div {
    width: 100%;
  }
}

ul.checkbox_list {
  padding: 0;
  margin-left: -24px;
  margin-right: 0;

  & > li {
    display: flex;
    list-style: none;
    padding-left: 24px;
    padding-right: 0;
  }

  &:has(p:dir(rtl)) {
    margin-left: 0;
    margin-right: -24px;

    & > li {
      padding-left: 0;
      padding-right: 24px;
    }
  }
}

ul.checkbox_list > li.checked > div > p {
  color: ${props.theme.textTertiary};
}

ul li,
ol li {
  &::before {
    background: url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iOCIgeT0iNyIgd2lkdGg9IjMiIGhlaWdodD0iMiIgcng9IjEiIGZpbGw9IiM0RTVDNkUiLz4KPHJlY3QgeD0iOCIgeT0iMTEiIHdpZHRoPSIzIiBoZWlnaHQ9IjIiIHJ4PSIxIiBmaWxsPSIjNEU1QzZFIi8+CjxyZWN0IHg9IjgiIHk9IjE1IiB3aWR0aD0iMyIgaGVpZ2h0PSIyIiByeD0iMSIgZmlsbD0iIzRFNUM2RSIvPgo8cmVjdCB4PSIxMyIgeT0iNyIgd2lkdGg9IjMiIGhlaWdodD0iMiIgcng9IjEiIGZpbGw9IiM0RTVDNkUiLz4KPHJlY3QgeD0iMTMiIHk9IjExIiB3aWR0aD0iMyIgaGVpZ2h0PSIyIiByeD0iMSIgZmlsbD0iIzRFNUM2RSIvPgo8cmVjdCB4PSIxMyIgeT0iMTUiIHdpZHRoPSIzIiBoZWlnaHQ9IjIiIHJ4PSIxIiBmaWxsPSIjNEU1QzZFIi8+Cjwvc3ZnPgo=") no-repeat;
    background-position: 0 2px;
    content: "";
    display: ${props.readOnly ? "none" : "inline-block"};
    cursor: grab;
    width: 24px;
    height: 24px;
    position: absolute;
    left: -40px;
    opacity: 0;
    transition: opacity 200ms ease-in-out;
  }

  &:dir(rtl)::before {
    left: auto;
    right: -40px;
  }
}

ul li[draggable=true]::before,
ol li[draggable=true]::before {
  cursor: grabbing;
}

ul > li.counter-2,
ol li.counter-2 {
  &::before {
    left: -50px;
  }
  &:dir(rtl)::before {
    left: auto;
    right: -50px;
  }
}

ul > li.hovering::before,
ol li.hovering::before {
  opacity: 0.5;
}

ul li.ProseMirror-selectednode::after,
ol li.ProseMirror-selectednode::after {
  display: none;
}

ul.checkbox_list > li {
  &::before {
    left: 0;
  }

  &:dir(rtl)::before {
    left: auto;
    right: 0;
  }
}

ul.checkbox_list {
  .checkbox {
    display: inline-block;
    cursor: var(--pointer);
    pointer-events: ${
      props.readOnly && !props.readOnlyWriteCheckboxes ? "none" : "initial"
    };
    opacity: ${props.readOnly && !props.readOnlyWriteCheckboxes ? 0.75 : 1};
    width: 14px;
    height: 14px;
    position: relative;
    top: 1px;
    transition: transform 100ms ease-in-out;
    opacity: .8;
    margin: 0 0.5em 0 0;

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

  &:has(p:dir(rtl)) {
    .checkbox {
      margin: 0 0 0 0.5em;
    }
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

hr::before {
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

hr.page-break::before {
  border-top: 1px dashed ${props.theme.horizontalRule};
}

.math-inline .math-src .ProseMirror,
code {
  border-radius: 4px;
  border: 1px solid ${props.theme.codeBorder};
  background: ${props.theme.codeBackground};
  padding: 3px 4px;
  color: ${props.theme.codeString};
  font-family: ${props.theme.fontFamilyMono};
  font-size: 90%;
}

mark {
  border-radius: 1px;
  padding: 2px 0;
  color: ${props.theme.text};

  a {
    color: ${props.theme.text};
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

.code-block {
  position: relative;
}

.code-block[data-language=none],
.code-block[data-language=markdown] {
  pre code {
    color: ${props.theme.text};
  }
}

.code-block[data-language=mermaidjs] {
  margin: 0.75em 0;

  ${
    !props.staticHTML &&
    css`
      pre {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        margin-bottom: -20px;
        overflow: hidden;
      }
    `
  }

  // Hide code without display none so toolbar can still be positioned against it
  &:not(.code-active) {
    height: ${props.staticHTML || props.readOnly ? "auto" : "0"};
    margin: -0.75em 0;
    overflow: hidden;

    // Allows the margin to collapse correctly by moving div out of the flow
    position: ${props.staticHTML || props.readOnly ? "relative" : "absolute"};
  }
}

.ProseMirror[contenteditable="false"] .code-block[data-language=mermaidjs] {
    height: 0;
    overflow: hidden;
    margin: -0.5em 0 0 0;
}

.code-block.with-line-numbers {
  pre {
    padding-left: calc(var(--line-number-gutter-width, 0) * 1em + 1.5em);
  }

  &::after {
    content: attr(data-line-numbers);
    position: absolute;
    padding-left: 0.5em;
    left: 1px;
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
  margin: 0.75em 0;
  min-height: 1.6em;
  background: ${props.theme.codeBackground};
  border-radius: 6px;
  border: 1px solid ${props.theme.codeBorder};
  padding: 8px;
  user-select: none;
  cursor: default;

  * {
    font-family: ${props.theme.fontFamily};
  }

  &.empty {
    font-family: ${props.theme.fontFamilyMono};
    font-size: 14px;
    color: ${props.theme.placeholder};
  }

  &.parse-error {
    font-family: ${props.theme.fontFamilyMono};
    font-size: 14px;
    color: ${props.theme.brand.red};
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
    border-bottom: 1px solid ${props.theme.divider};
  }

  td,
  th {
    position: relative;
    vertical-align: top;
    border: 1px solid ${props.theme.divider};
    position: relative;
    padding: 4px 8px;
    text-align: start;
    min-width: 100px;
    font-weight: normal;
  }

  th {
    background: ${transparentize(0.75, props.theme.divider)};
    color: ${props.theme.textSecondary};
    font-weight: 500;
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

  .${EditorStyleHelper.tableAddRow},
  .${EditorStyleHelper.tableAddColumn},
  .${EditorStyleHelper.tableGrip},
  .${EditorStyleHelper.tableGripColumn},
  .${EditorStyleHelper.tableGripRow} {
    @media print {
      display: none;
    }
  }

  .${EditorStyleHelper.tableAddRow},
  .${EditorStyleHelper.tableAddColumn} {
    display: block;
    position: absolute;
    background: ${props.theme.accent};
    cursor: var(--pointer);

    &:hover::after {
      width: 16px;
      height: 16px;
      z-index: 20;
      background-color: ${props.theme.accent};
      background-size: 16px 16px;
      background-position: 50% 50%;
      background-image: url("data:image/svg+xml;base64,${btoa(
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 5C11.4477 5 11 5.44772 11 6V11H6C5.44772 11 5 11.4477 5 12C5 12.5523 5.44772 13 6 13H11V18C11 18.5523 11.4477 19 12 19C12.5523 19 13 18.5523 13 18V13H18C18.5523 13 19 12.5523 19 12C19 11.4477 18.5523 11 18 11H13V6C13 5.44772 12.5523 5 12 5Z" fill="white"/></svg>'
      )}")
    }

    // extra clickable area
    &::before {
      content: "";
      display: block;
      cursor: var(--pointer);
      position: absolute;
      width: 24px;
      height: 24px;
    }
  }

  .${EditorStyleHelper.tableAddRow} {
    bottom: -1px;
    left: -16px;
    width: 0;
    height: 2px;

    &::after {
      content: "";
      position: absolute;
      bottom: -1px;
      left: -10px;
      width: 4px;
      height: 4px;
      display: ${props.readOnly ? "none" : "block"};
      border-radius: 100%;
      background-color: ${props.theme.divider};
    }

    &:hover {
      width: calc(var(--table-width) - ${EditorStyleHelper.padding * 1.5}px);
    }

    &:hover::after {
      bottom: -7.5px;
      left: -16px;
    }

    // extra clickable area
    &::before {
      bottom: -12px;
      left: -18px;
    }

    &.first {
      bottom: auto;
      top: -1px;

      &::before {
        bottom: auto;
        top: -12px;
      }
    }
  }

  .${EditorStyleHelper.tableAddColumn} {
    top: -16px;
    right: -1px;
    width: 2px;
    height: 0;

    &::after {
      content: "";
      position: absolute;
      top: -10px;
      right: -1px;
      width: 4px;
      height: 4px;
      display: ${props.readOnly ? "none" : "block"};
      border-radius: 100%;
      background-color: ${props.theme.divider};
    }

    &:hover {
      height: calc(var(--table-height) - ${EditorStyleHelper.padding}px + 6px);
    }

    &:hover::after {
      top: -16px;
      right: -7px;
    }

    // extra clickable area
    &::before {
      top: -16px;
      right: -12px;
    }

    &.first {
      right: auto;
      left: -1px;

      &::before {
        right: auto;
        left: -12px;
      }
    }
  }

  .${EditorStyleHelper.tableGripColumn} {
    /* usage of ::after for all of the table grips works around a bug in
     * prosemirror-tables that causes Safari to hang when selecting a cell
     * in an empty table:
     * https://github.com/ProseMirror/prosemirror/issues/947 */
    &::after {
      content: "";
      cursor: var(--pointer);
      position: absolute;
      top: -16px;
      left: 0;
      width: 100%;
      height: 12px;
      background: ${props.theme.divider};
      display: ${props.readOnly ? "none" : "block"};
    }

    &:hover::after {
      background: ${props.theme.text};
    }
    &.first::after {
      border-top-left-radius: 3px;
      border-bottom-left-radius: 3px;
    }
    &.last::after {
      border-top-right-radius: 3px;
      border-bottom-right-radius: 3px;
    }
    &.selected::after {
      background: ${props.theme.tableSelected};
    }
  }

  .${EditorStyleHelper.tableGripRow} {
    &::after {
      content: "";
      cursor: var(--pointer);
      position: absolute;
      left: -16px;
      top: 0;
      height: 100%;
      width: 12px;
      background: ${props.theme.divider};
      border-color: ${props.theme.background};
      display: ${props.readOnly ? "none" : "block"};
    }

    &:hover::after {
      background: ${props.theme.text};
    }
    &.first::after {
      border-top-left-radius: 3px;
      border-top-right-radius: 3px;
    }
    &.last::after {
      border-bottom-left-radius: 3px;
      border-bottom-right-radius: 3px;
    }
    &.selected::after {
      background: ${props.theme.tableSelected};
    }
  }

  .${EditorStyleHelper.tableGrip} {
    &::after {
      content: "";
      cursor: var(--pointer);
      background: ${props.theme.divider};
      width: 13px;
      height: 13px;
      border-radius: 13px;
      border: 2px solid ${props.theme.background};
      position: absolute;
      top: -18px;
      left: -18px;
      display: ${props.readOnly ? "none" : "block"};
      z-index: 10;
    }

    &:hover::after {
      background: ${props.theme.text};
    }
    &.selected::after {
      background: ${props.theme.tableSelected};
    }
  }
}

.${EditorStyleHelper.table} {
  position: relative;
}

.${EditorStyleHelper.tableScrollable} {
  position: relative;
  margin: -1em ${-EditorStyleHelper.padding}px -0.5em;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
  overflow-y: hidden;
  overflow-x: auto;
  padding-top: 1em;
  padding-bottom: .5em;
  padding-left: ${EditorStyleHelper.padding}px;
  padding-right: ${EditorStyleHelper.padding}px;
  transition: border 250ms ease-in-out 0s;

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

.${EditorStyleHelper.tableShadowLeft}::before,
.${EditorStyleHelper.tableShadowRight}::after {
  content: "";
  position: absolute;
  top: 1px;
  bottom: 0;
  left: -1em;
  width: 32px;
  z-index: 20;
  transition: box-shadow 250ms ease-in-out;
  border: 0px solid transparent;
  pointer-events: none;
}

.${EditorStyleHelper.tableShadowLeft}::before {
  left: -${EditorStyleHelper.padding}px;
  right: auto;
  box-shadow: 16px 0 16px -16px inset rgba(0, 0, 0, ${
    props.theme.isDark ? 1 : 0.25
  });
  border-left: ${EditorStyleHelper.padding}px solid ${props.theme.background};
}

.${EditorStyleHelper.tableShadowRight}::after {
  right: -${EditorStyleHelper.padding}px;
  left: auto;
  box-shadow: -16px 0 16px -16px inset rgba(0, 0, 0, ${
    props.theme.isDark ? 1 : 0.25
  });
  border-right: ${EditorStyleHelper.padding}px solid ${props.theme.background};
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
    background: ${props.theme.backgroundSecondary};
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

.ProseMirror-gapcursor::after {
  content: "";
  display: block;
  position: absolute;
  top: -2px;
  width: 20px;
  border-top: 1px solid ${props.theme.cursor};
  animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
}

.folded-content,
.folded-content + .mermaid-diagram-wrapper {
  display: none;
  user-select: none;
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
  .placeholder::before,
  .block-menu-trigger,
  .heading-actions,
  button.show-source-button,
  h1:not(.placeholder)::before,
  h2:not(.placeholder)::before,
  h3:not(.placeholder)::before,
  h4:not(.placeholder)::before,
  h5:not(.placeholder)::before,
  h6:not(.placeholder)::before {
    display: none;
  }

  .image {
    page-break-inside: avoid;
  }

  .${EditorStyleHelper.comment} {
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
  ${codeBlockStyle}
  ${findAndReplaceStyle}
  ${emailStyle}
`;

export default EditorContainer;
