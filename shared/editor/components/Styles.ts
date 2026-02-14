/* oxlint-disable no-irregular-whitespace */
import { lighten, transparentize } from "polished";
import type { DefaultTheme } from "styled-components";
import styled, { css, keyframes } from "styled-components";
import { breakpoints, hover } from "../../styles";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { videoStyle } from "./Video";

export type Props = {
  $rtl: boolean;
  readOnly?: boolean;
  readOnlyWriteCheckboxes?: boolean;
  commenting?: boolean;
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

export const pulse = (color: string) => keyframes`
  0% { box-shadow: 0 0 0 1px ${color} }
  50% { box-shadow: 0 0 0 4px ${color} }
  100% { box-shadow: 0 0 0 1px ${color} }
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
    font-family: ${props.theme.fontFamilyMono};
    cursor: auto;
    white-space: pre-wrap;
    overflow-x: auto;
    overflow-y: hidden;
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

    .ProseMirror-focused {
      border-radius: 2px;
      outline: 2px solid
        ${props.readOnly ? "transparent" : props.theme.selected};
    }
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

  .token.boolean,
  .token.number {
    color: ${props.theme.codeNumber};
  }

  .token.property,
  .token.variable {
    color: ${props.theme.codeProperty};
  }

  .token.tag {
    color: ${props.theme.codeTag};
  }

  .token.char,
  .token.builtin,
  .token.string {
    color: ${props.theme.codeString};
  }

  .token.selector {
    color: ${props.theme.codeSelector};
  }

  .token.attr-name {
    color: ${props.theme.codeAttrName};
  }

  .token.attr-value,
  .token.attr-value .token.punctuation {
    color: ${props.theme.codeAttrValue};
  }

  .token.operator {
    color: ${props.theme.codeOperator};
  }

  .token.namespace {
    opacity: 0.8;
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
    color: ${props.theme.textDiffDeleted};
    background-color: ${props.theme.textDiffDeletedBackground};
  }

  .token.inserted {
    color: ${props.theme.textDiffInserted};
    background-color: ${props.theme.textDiffInsertedBackground};
    text-decoration: none;
  }

  .token.italic {
    font-style: italic;
  }

  .token.important,
  .token.bold {
    font-weight: bold;
  }

  .token.constant {
    color: ${props.theme.codeConstant};
  }

  .token.parameter {
    color: ${props.theme.codeParameter};
  }

  .token.important {
    color: ${props.theme.codeImportant};
  }

  .token.entity {
    cursor: help;
  }
`;

const diffStyle = (props: Props) => css`
  .${EditorStyleHelper.diffNodeInsertion},
    .${EditorStyleHelper.diffInsertion}:not([class^="component-"]),
  .${EditorStyleHelper.diffInsertion} > * {
    color: ${props.theme.textDiffInserted};
    background-color: ${props.theme.textDiffInsertedBackground};
    text-decoration: none;

    &.${EditorStyleHelper.diffCurrentChange} {
      outline-color: ${lighten(0.2, props.theme.textDiffInserted)};
      background-color: ${lighten(0.2, props.theme.textDiffInsertedBackground)};
      animation: ${pulse(lighten(0.2, props.theme.textDiffInsertedBackground))}
        150ms 1;
    }
  }

  .${EditorStyleHelper.diffNodeInsertion} {
    &[class*="component-"] {
      outline: 4px solid ${props.theme.textDiffInsertedBackground};
    }

    td,
    th {
      border-color: ${props.theme.textDiffInsertedBackground};
    }
  }

  .${EditorStyleHelper.diffNodeInsertion}[class*="component-"],
    .${EditorStyleHelper.diffNodeInsertion}.math-node,
    ul.${EditorStyleHelper.diffNodeInsertion},
    li.${EditorStyleHelper.diffNodeInsertion} {
    border-radius: ${EditorStyleHelper.blockRadius};
  }

  td.${EditorStyleHelper.diffNodeInsertion},
    th.${EditorStyleHelper.diffNodeInsertion} {
    border-color: ${props.theme.textDiffInsertedBackground};
  }

  .${EditorStyleHelper.diffNodeDeletion},
    .${EditorStyleHelper.diffDeletion}:not([class^="component-"]),
  .${EditorStyleHelper.diffDeletion} > * {
    color: ${props.theme.textDiffDeleted};
    background-color: ${props.theme.textDiffDeletedBackground};
    text-decoration: line-through;

    &.${EditorStyleHelper.diffCurrentChange} {
      outline-color: ${lighten(0.2, props.theme.textDiffDeletedBackground)};
      background-color: ${lighten(0.2, props.theme.textDiffDeletedBackground)};
      animation: ${pulse(lighten(0.2, props.theme.textDiffDeletedBackground))}
        150ms 1;
    }
  }

  .${EditorStyleHelper.diffNodeDeletion} {
    &[class*="component-"] {
      outline: 4px solid ${props.theme.textDiffDeletedBackground};
    }

    .mention {
      background-color: ${props.theme.textDiffDeletedBackground};
    }

    td,
    th {
      border-color: ${props.theme.textDiffDeletedBackground};
    }
  }

  .${EditorStyleHelper.diffNodeDeletion}[class*="component-"],
    .${EditorStyleHelper.diffNodeDeletion}.math-node,
    ul.${EditorStyleHelper.diffNodeDeletion},
    li.${EditorStyleHelper.diffNodeDeletion} {
    border-radius: ${EditorStyleHelper.blockRadius};
  }

  td.${EditorStyleHelper.diffNodeDeletion},
    th.${EditorStyleHelper.diffNodeDeletion} {
    border-color: ${props.theme.textDiffDeletedBackground};
  }

  .${EditorStyleHelper.diffNodeModification},
    .${EditorStyleHelper.diffModification}:not([class^="component-"]),
  .${EditorStyleHelper.diffModification} > * {
    color: ${props.theme.text};
    background-color: ${transparentize(0.7, "#FFA500")};
    text-decoration: none;

    &.${EditorStyleHelper.diffCurrentChange} {
      outline-color: ${lighten(0.1, "#FFA500")};
      background-color: ${transparentize(0.5, "#FFA500")};
      animation: ${pulse(transparentize(0.5, "#FFA500"))} 150ms 1;
    }
  }

  .${EditorStyleHelper.diffNodeModification} {
    background-color: ${transparentize(0.7, "#FFA500")};

    &[class*="component-"] {
      outline: 4px solid ${transparentize(0.5, "#FFA500")};
    }

    td,
    th {
      border-color: ${transparentize(0.5, "#FFA500")};
    }
  }

  .${EditorStyleHelper.diffNodeModification}[class*="component-"],
    .${EditorStyleHelper.diffNodeModification}.math-node,
    ul.${EditorStyleHelper.diffNodeModification},
    li.${EditorStyleHelper.diffNodeModification} {
    border-radius: ${EditorStyleHelper.blockRadius};
  }

  td.${EditorStyleHelper.diffNodeModification},
    th.${EditorStyleHelper.diffNodeModification} {
    border-color: ${transparentize(0.5, "#FFA500")};
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
      animation: ${pulse("rgba(255, 213, 0, 0.75)")} 150ms 1;
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

/**
 * Adjustments to line-height and paragraph margins for complex scripts. If adding
 * scripts here you also need to update the `getLangFor` method.
 *
 * @returns The CSS styles for complex scripts.
 */
const textStyle = () => css`
  /* Southeast Asian scripts */
  :lang(th),  /* Thai */
    :lang(lo),  /* Lao */
    :lang(km),  /* Khmer */
    :lang(my) {
    /* Burmese */
    p {
      line-height: 1.7;
    }

    .ProseMirror > p {
      margin-top: 0.8em;
      margin-bottom: 0.8em;
    }
  }

  /* South Asian scripts */
  :lang(hi),  /* Hindi */
    :lang(mr),  /* Marathi */
    :lang(ne),  /* Nepali */
    :lang(bn),  /* Bengali */
    :lang(gu),  /* Gujarati */
    :lang(pa),  /* Punjabi */
    :lang(te),  /* Telugu */
    :lang(ta),  /* Tamil */
    :lang(ml),  /* Malayalam */
    :lang(si) {
    /* Sinhala */
    p {
      line-height: 1.7;
    }

    .ProseMirror > p {
      margin-top: 0.8em;
      margin-bottom: 0.8em;
    }
  }

  /* Tibetan and related scripts */
  :lang(bo) {
    p {
      line-height: 1.8;
    }

    .ProseMirror > p {
      margin-top: 0.8em;
      margin-bottom: 0.8em;
    }
  }

  /* Middle Eastern scripts */
  :lang(ar),  /* Arabic */
    :lang(fa),  /* Persian */
    :lang(ur),  /* Urdu */
    :lang(he) {
    /* Hebrew */
    p {
      line-height: 1.6;
    }
  }

  /* Ethiopic and other complex scripts */
  :lang(am),  /* Amharic */
    :lang(mn) {
    /* Mongolian */
    p {
      line-height: 1.7;
    }

    .ProseMirror > p {
      margin-top: 0.8em;
      margin-bottom: 0.8em;
    }
  }
`;

const style = (props: Props) => css`
--font-size-p: var(--font-size-body);
--font-size-h1: 28px;
--font-size-h2: 22px;
--font-size-h3: 18px;
--font-size-h4: 16px;
--font-size-h5: 15px;
--font-size-h6: 15px;

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

  &[data-type="user"],
  &[data-type="group"] {
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
    margin-top: 0 !important;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin-top: 1em;
    margin-bottom: 0.25em;
    line-height: inherit;
    font-weight: 600;
    cursor: text;
    clear: both;

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
  h1 { font-size: var(--font-size-h1); }
  h2 { font-size: var(--font-size-h2); }
  h3 { font-size: var(--font-size-h3); }
  h4 { font-size: var(--font-size-h4); }
  h5 { font-size: var(--font-size-h5); }
  h6 { font-size: var(--font-size-h6); }

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
  border-radius: ${EditorStyleHelper.blockRadius};
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

.pdf {
  position: relative;
  width: max-content;
  height: max-content;
  margin-right: auto;
  margin-left: auto;
  max-width: 100%;
  clear: both;
  z-index: 1;
  transition-property: width, height;
  transition-duration: 80ms;
  transition-timing-function: ease-in-out;

  embed {
    display: block;
    max-width: 100%;
    contain: strict,
    content-visibility: auto,
    backface-visibility: hidden,
    transition-property: width, height;
    transition-duration: 80ms;
    transition-timing-function: ease-in-out;
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
  transform: translateX(calc(50% + var(--container-width) * -0.5 + var(--full-width-transform-offset)));

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
  }px + var(--container-width) * -0.5 + var(--full-width-transform-offset)));

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

.component-image {
  display: block;
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
  width: 100%;
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

.${EditorStyleHelper.headingPositionAnchor}, .${EditorStyleHelper.imagePositionAnchor} {
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

.${EditorStyleHelper.headingPositionAnchor}:first-child,
// Edge case where multiplayer cursor is between start of cell and heading
.${EditorStyleHelper.headingPositionAnchor}:first-child + .ProseMirror-yjs-cursor,
// Edge case where table grips are between start of cell and heading
.${EditorStyleHelper.headingPositionAnchor}:first-child + [role=button] + [role=button] {
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
    &:not(.placeholder)::before {
      opacity: 1;
    }
  }
}

.ProseMirror[contenteditable="true"] {
  & .image-wrapper.ProseMirror-selectednode > a {
    /* force zoom-in cursor if image node is selected */
    cursor: zoom-in !important;
  }
  &.ProseMirror-focused {
    .image-wrapper:not(.ProseMirror-selectednode) > a {
      /* prevents cursor from turning to pointer on pointer down */
      pointer-events: none;
    }
  }
  &:not(.ProseMirror-focused) {
    .image-wrapper  {
      & > a[href] {
        cursor: pointer;
      }
      & > a:not([href]) {
        /* prevents cursor from turning to pointer on pointer down */
        pointer-events: none;
      }
    }
  }
}

.ProseMirror[contenteditable="false"] {
  .image-wrapper  {
    & > a[href] {
      cursor: pointer;
    }
    & > a:not([href]) {
      cursor: zoom-in;
    }
  }
}

.with-emoji {
  margin-${props.$rtl ? "right" : "left"}: -1em;
}

.emoji img {
  width: 1em;
  height: 1em;
  vertical-align: middle;
  position: relative;
  top: -0.1em;
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

.ProseMirror.exported {
  .heading-fold {
    display: none;
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
  position: absolute;
  left: 0;
  top: calc(.5em - 6px);
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

${
  props.commenting
    ? `
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
`
    : `
.${EditorStyleHelper.comment} {
  background: transparent !important;
  border: none !important;
}
`
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

.heading-content {
  position: relative;
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
  margin-top: .25em;

  p {
    white-space: pre-wrap;
  }

  > div {
    width: 100%;
  }
}

.${EditorStyleHelper.checklistWrapper} {
  position: relative;
  margin: 1em 0;
}

.${EditorStyleHelper.checklistCompletedToggle} {
  position: absolute;
  top: -8px;
  right: 0;
  padding: 4px 8px;
  font-size: 12px;
  background: ${props.theme.background};
  border: 1px solid ${props.theme.buttonNeutralBorder};
  border-radius: 6px;
  color: ${props.theme.textSecondary};
  cursor: var(--pointer);
  user-select: none;
  z-index: 1;
  opacity: 0;
  transition: all 100ms ease-in-out;

  &:${hover} {
    background: ${props.theme.buttonNeutralBackground};
    color: ${props.theme.text};
  }

  &:active {
    transform: scale(0.98);
  }
}

.${EditorStyleHelper.checklistWrapper}:${hover} .${EditorStyleHelper.checklistCompletedToggle},
.${EditorStyleHelper.checklistWrapper}:focus-within .${EditorStyleHelper.checklistCompletedToggle} {
  opacity: 1;
}

.${EditorStyleHelper.checklistWrapper}.${EditorStyleHelper.checklistCompletedHidden} .${EditorStyleHelper.checklistCompletedToggle} {
  opacity: 1;
}

.${EditorStyleHelper.checklistWrapper}.${EditorStyleHelper.checklistCompletedHidden} ul.checkbox_list > li.checked {
  display: none;
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
  clear: both;
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
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;

  border-radius: 4px;
  border: 1px solid ${props.theme.codeBorder};
  background: ${props.theme.codeBackground};
  padding: 3px 4px;
  color: ${props.theme.code};
  font-family: ${props.theme.fontFamilyMono};
  font-size: 90%;

  .${EditorStyleHelper.codeWord} {
    @media (min-width: ${breakpoints.tablet}px) {
      white-space: nowrap;
    }
    color: ${props.theme.codeKeyword};
  }
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

.code-block[data-language=mermaid],
.code-block[data-language=mermaidjs] {
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

  &:is(.code-active) + .mermaid-diagram-wrapper {
    cursor: zoom-in;
  }

  // Hide code without display none so toolbar can still be positioned against it
  &:not(.code-active) {
    height: ${props.staticHTML || props.readOnly ? "auto" : "0"};
    margin: 0.5em 0 -0.75em 0px;
    overflow: hidden;
    position: relative;
  }
}

.ProseMirror[contenteditable="false"] .code-block[data-language=mermaid],
.ProseMirror[contenteditable="false"] .code-block[data-language=mermaidjs] {
    height: 0;
    overflow: hidden;

    & + .mermaid-diagram-wrapper {
      cursor: zoom-in;
    }
}

.ProseMirror.exported {
    .code-block[data-language=mermaid],
    .code-block[data-language=mermaidjs] {
        height: auto;
        overflow: visible;

        &::after {
          display: none;
        }
    }

    .mermaid-diagram-wrapper {
        display: none;
    }
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
  border-radius: ${EditorStyleHelper.blockRadius};
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
  border-collapse: separate;
  border-radius: ${EditorStyleHelper.blockRadius};
  margin-top: 1em;
  box-sizing: border-box;
  border: 1px solid ${props.theme.divider};
  border-left: 0;
  border-spacing: 0;

  * {
    box-sizing: border-box;
  }

  tr {
    position: relative;
    border-bottom: 1px solid ${props.theme.divider};
    border-color: inherit;
  }

  td,
  th {
    position: relative;
    vertical-align: top;
    position: relative;
    padding: 4px 8px;
    text-align: start;
    min-width: 100px;
    font-weight: normal;
    border-left: 1px solid ${props.theme.divider};
    border-top: 1px solid ${props.theme.divider};
  }

  th {
    background: ${props.theme.background};
    background-image: linear-gradient(
      ${transparentize(0.75, props.theme.divider)},
      ${transparentize(0.75, props.theme.divider)}
    );
    color: ${props.theme.textSecondary};
    font-weight: 500;
  }

  tr:first-child {
    position: relative;
    z-index: 2;
  }

  tr:first-child th,
  tr:first-child td {
    border-top: 0;
  }
  tr:first-child th[data-first-column],
  tr:first-child td[data-first-column] {
    border-top-left-radius: ${EditorStyleHelper.blockRadius};
  }
  th[data-first-column][data-last-row],
  td[data-first-column][data-last-row] {
    border-bottom-left-radius: ${EditorStyleHelper.blockRadius};
  }
  tr:first-child th[data-last-column],
  tr:first-child td[data-last-column] {
    border-top-right-radius: ${EditorStyleHelper.blockRadius};
  }
  th[data-last-column][data-last-row],
  td[data-last-column][data-last-row] {
    border-bottom-right-radius: ${EditorStyleHelper.blockRadius};
  }

  td .component-embed {
    padding: 4px 0;
  }

  td[data-bgcolor] {
    color: var(--cell-text-color);

    p, a, p a {
      color: var(--cell-text-color, inherit);
    }

    a, p a {
      text-decoration: underline;
      text-decoration-color: var(--cell-text-color, inherit);
    }
  }

  .selectedCell {
    ${
      props.readOnly
        ? "background: inherit;"
        : `/* Using box-shadow inset instead of background to allow overlay on cell background colors */
    box-shadow: inset 0 0 0 9999px ${props.theme.tableSelectedBackground};`
    }

    /* fixes Firefox background color painting over border:
      * https://bugzilla.mozilla.org/show_bug.cgi?id=688556 */
    background-clip: padding-box;
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
    z-index: 1;

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
    z-index: 1;

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
      cursor: grab;
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

    body.${EditorStyleHelper.tableDragging} &:hover::after {
      background: ${props.theme.divider};
    }
    &.first::after {
      border-top-left-radius: 3px;
      border-bottom-left-radius: 3px;
    }
    &.selected::after {
      background: ${props.theme.tableSelected};
    }
  }

  [data-last-column] .${EditorStyleHelper.tableGripColumn}::after {
    border-top-right-radius: 3px;
    border-bottom-right-radius: 3px;
  }

  .${EditorStyleHelper.tableGripRow} {
    &::after {
      content: "";
      cursor: grab;
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

    body.${EditorStyleHelper.tableDragging} &:hover::after {
      background: ${props.theme.divider};
    }
    &.first::after {
      border-top-left-radius: 3px;
      border-top-right-radius: 3px;
    }
    &.selected::after {
      background: ${props.theme.tableSelected};
    }
  }

  [data-last-row] .${EditorStyleHelper.tableGripRow}::after {
    border-bottom-left-radius: 3px;
    border-bottom-right-radius: 3px;
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
    &.dragging::after {
      background: ${props.theme.accent};
      opacity: 0.5;
    }
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
}

.${EditorStyleHelper.tableDragDropIndicator} {
  position: absolute;
  background: ${props.theme.accent};
  pointer-events: none;
  z-index: 100;
  opacity: 0;
  transition: opacity 100ms ease-in-out;

  &.active {
    opacity: 1;
  }

  &[data-type="row"] {
    height: 2px;
    border-radius: 1px;
  }

  &[data-type="column"] {
    width: 2px;
    border-radius: 1px;
  }
}

.${EditorStyleHelper.tableGripRow},
.${EditorStyleHelper.tableGripColumn} {
  &.dragging::after {
    cursor: grabbing;
    background: ${props.theme.accent};
    opacity: 0.5;
  }
}

.${EditorStyleHelper.tableDragIndicatorLeft},
.${EditorStyleHelper.tableDragIndicatorRight} {
  position: absolute;
  top: 0;
  width: 2px;
  height: calc(var(--table-height) - ${EditorStyleHelper.padding}px - 10px);
  background: ${props.theme.accent};
  z-index: 100;
  pointer-events: none;
}

.${EditorStyleHelper.tableDragIndicatorLeft} {
  left: -1px;
}

.${EditorStyleHelper.tableDragIndicatorRight} {
  right: -1px;
}

.${EditorStyleHelper.tableDragIndicatorTop},
.${EditorStyleHelper.tableDragIndicatorBottom} {
  position: absolute;
  left: 0;
  height: 2px;
  width: calc(var(--table-width) - ${EditorStyleHelper.padding * 2}px - 2px);
  background: ${props.theme.accent};
  z-index: 100;
  pointer-events: none;
}

.${EditorStyleHelper.tableDragIndicatorTop} {
  top: -1px;
}

.${EditorStyleHelper.tableDragIndicatorBottom} {
  bottom: -1px;
}

.${EditorStyleHelper.table} {
  position: relative;
}

.${EditorStyleHelper.tableStickyHeader} {
  th {
    transform: translateY(calc(var(--header-offset, 64px) + var(--sticky-scroll-offset, 0px)));
    border-bottom: 1px solid ${props.theme.divider};

    // Mask content scrolling past the top of the header
    box-shadow: 0 -1px 0 ${props.theme.divider};
    border-radius: 0 !important;

    .${EditorStyleHelper.tableGripColumn},
    .${EditorStyleHelper.tableAddColumn},
    .${EditorStyleHelper.tableAddRow},
    .${EditorStyleHelper.tableGrip} {
      display: none;
    }
  }

  .${EditorStyleHelper.tableGrip} {
    display: none;
  }
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
  margin-${props.$rtl ? "right" : "left"}: -28px;
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

.toggle-block {
  display: flex;

  &:focus-within {
    transition-delay: 0.1s;
  }

  &.folded {
    &:dir(rtl) {
      --rotate-by: 90deg;
    }
    &:dir(ltr) {
      --rotate-by: -90deg;
    }
    > .toggle-block-content > :is(:not(.toggle-block-head)) {
      display: none;
    }
    > .toggle-block-content > :is(a.heading-name) {
      display: unset;
    }
    > .toggle-block-button {
      svg {
        transform: rotate(var(--rotate-by));
        pointer-events: none;
      }
      opacity: 1;
    }
  }

  > .toggle-block-button {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    --line-height: var(--line-height-p);
    --font-size: var(--font-size-p);

    &:has(+ .toggle-block-content > .toggle-block-head > h1) {
      --line-height: calc(var(--line-height-h) + 0.2);
      --font-size: var(--font-size-h1);
    }

    &:has(+ .toggle-block-content > .toggle-block-head > h2) {
      --line-height: calc(var(--line-height-h) + 0.2);
      --font-size: var(--font-size-h2);
    }

    &:has(+ .toggle-block-content > .toggle-block-head > h3) {
      --line-height: calc(var(--line-height-h) + 0.2);
      --font-size: var(--font-size-h3);
    }

    &:has(+ .toggle-block-content > .toggle-block-head > h4) {
      --line-height: calc(var(--line-height-h) + 0.2);
      --font-size: var(--font-size-h4);
    }

    color: ${props.theme.text};
    opacity: 0.75;
    cursor: var(--pointer);
    background: none;
    outline: none;
    border: 0;
    margin: 0;
    padding: 0;
    height: calc(var(--line-height) * var(--font-size));
    width: 20px;
    overflow: unset;

    &:focus,
    &:hover {
      opacity: 1;
    }

    > svg {
      transition: transform 200ms ease-out;
      flex-shrink: 0;
    }
  }

  > .toggle-block-content {
    > :is(:not(.toggle-block-head)) {
      margin-top: 0.5em;
    }
    > :is(:first-child) {
      margin-top: 0;
    }
    > .toggle-block-head {
      > * {
        margin-top: 0;
      }
    }
    flex-grow: 1;
    overflow: unset;
  }
}
`;

const EditorContainer = styled.div<Props>`
  ${style}
  ${mathStyle}
  ${codeMarkCursor}
  ${codeBlockStyle}
  ${diffStyle}
  ${findAndReplaceStyle}
  ${emailStyle}
  ${textStyle}
`;

export default EditorContainer;
