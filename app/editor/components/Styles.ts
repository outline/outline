/* eslint-disable no-irregular-whitespace */
import { darken, lighten, transparentize } from "polished";
import styled from "styled-components";

const EditorStyles = styled.div<{
  rtl: boolean;
  readOnly?: boolean;
  readOnlyWriteCheckboxes?: boolean;
  grow?: boolean;
}>`
  flex-grow: ${(props) => (props.grow ? 1 : 0)};
  justify-content: start;
  color: ${(props) => props.theme.text};
  font-family: ${(props) => props.theme.fontFamily};
  font-weight: ${(props) => props.theme.fontWeight};
  font-size: 1em;
  line-height: 1.6em;
  width: 100%;

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

    & > .ProseMirror-yjs-cursor {
      display: none;
    }

    & > * {
      margin-top: .5em;
      margin-bottom: .5em;
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

    img {
      pointer-events: ${(props) => (props.readOnly ? "initial" : "none")};
      display: inline-block;
      max-width: 100%;
      max-height: 75vh;
    }

    .ProseMirror-selectednode img {
      pointer-events: initial;
    }
  }

  .image.placeholder {
    position: relative;
    background: ${(props) => props.theme.background};
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
    width: 50%;
    margin-left: 2em;
    margin-bottom: 1em;
    clear: initial;
  }

  .image-left-50 {
    float: left;
    width: 50%;
    margin-right: 2em;
    margin-bottom: 1em;
    clear: initial;
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
      ${(props) => (props.readOnly ? "transparent" : props.theme.selected)};
  }

  /* Make sure li selections wrap around markers */

  li.ProseMirror-selectednode {
    outline: none;
  }

  li.ProseMirror-selectednode:after {
    content: "";
    position: absolute;
    left: ${(props) => (props.rtl ? "-2px" : "-32px")};
    right: ${(props) => (props.rtl ? "-32px" : "-2px")};
    top: -2px;
    bottom: -2px;
    border: 2px solid ${(props) => props.theme.selected};
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
      display: ${(props) => (props.readOnly ? "none" : "inline-block")};
      font-family: ${(props) => props.theme.fontFamilyMono};
      color: ${(props) => props.theme.textSecondary};
      font-size: 13px;
      line-height: 0;
      margin-${(props) => (props.rtl ? "right" : "left")}: -24px;
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
    color: ${(props) => props.theme.text};
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
    margin-${(props) => (props.rtl ? "right" : "left")}: -1em;
  }

  .heading-anchor,
  .heading-fold {
    display: inline-block;
    color: ${(props) => props.theme.text};
    opacity: .75;
    cursor: pointer;
    background: none;
    outline: none;
    border: 0;
    margin: 0;
    padding: 0;
    text-align: left;
    font-family: ${(props) => props.theme.fontFamilyMono};
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
    background: ${(props) => props.theme.background};
    margin-${(props) => (props.rtl ? "right" : "left")}: -26px;
    flex-direction: ${(props) => (props.rtl ? "row-reverse" : "row")};
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
        transform: rotate(${(props) => (props.rtl ? "90deg" : "-90deg")});
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
    content: ${(props) => (props.readOnly ? "" : "attr(data-empty-text)")};
    pointer-events: none;
    height: 0;
    color: ${(props) => props.theme.placeholder};
  }

  /** Show the placeholder if focused or the first visible item nth(2) accounts for block insert trigger */
  .ProseMirror-focused .placeholder:before,
  .placeholder:nth-child(1):before,
  .placeholder:nth-child(2):before {
    opacity: 1;
  }

  .notice-block {
    display: flex;
    align-items: center;
    background: ${(props) =>
      transparentize(0.9, props.theme.noticeInfoBackground)};
    border-left: 4px solid ${(props) => props.theme.noticeInfoBackground};
    color: ${(props) => props.theme.noticeInfoText};
    border-radius: 4px;
    padding: 8px 10px 8px 8px;
    margin: 8px 0;

    a {
      color: ${(props) => props.theme.noticeInfoText};
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
    margin-${(props) => (props.rtl ? "left" : "right")}: 4px;
    color: ${(props) => props.theme.noticeInfoBackground};
  }

  .notice-block.tip {
    background: ${(props) =>
      transparentize(0.9, props.theme.noticeTipBackground)};
    border-left: 4px solid ${(props) => props.theme.noticeTipBackground};
    color: ${(props) => props.theme.noticeTipText};

    .icon {
      color: ${(props) => props.theme.noticeTipBackground};
    }

    a {
      color: ${(props) => props.theme.noticeTipText};
    }
  }

  .notice-block.warning {
    background: ${(props) =>
      transparentize(0.9, props.theme.noticeWarningBackground)};
    border-left: 4px solid ${(props) => props.theme.noticeWarningBackground};
    color: ${(props) => props.theme.noticeWarningText};

    .icon {
      color: ${(props) => props.theme.noticeWarningBackground};
    }

    a {
      color: ${(props) => props.theme.noticeWarningText};
    }
  }

  blockquote {
    margin: 0;
    padding-left: 1.5em;
    font-style: italic;
    overflow: hidden;
    position: relative;

    &:before {
      content: "";
      display: inline-block;
      width: 2px;
      border-radius: 1px;
      position: absolute;
      margin-${(props) => (props.rtl ? "right" : "left")}: -1.5em;
      top: 0;
      bottom: 0;
      background: ${(props) => props.theme.quote};
    }
  }

  b,
  strong {
    font-weight: 600;
  }

  .template-placeholder {
    color: ${(props) => props.theme.placeholder};
    border-bottom: 1px dotted ${(props) => props.theme.placeholder};
    border-radius: 2px;
    cursor: text;

    &:hover {
      border-bottom: 1px dotted
        ${(props) =>
          props.readOnly ? props.theme.placeholder : props.theme.textSecondary};
    }
  }

  p {
    margin: 0;

    span:first-child + br:last-child {
      display: none;
    }

    a {
      color: ${(props) => props.theme.text};
      text-decoration: underline;
      text-decoration-color: ${(props) => lighten(0.5, props.theme.text)};
      text-decoration-thickness: 1px;
      text-underline-offset: .15em;
      font-weight: 500;

      &:hover {
        text-decoration: underline;
        text-decoration-color: ${(props) => props.theme.text};
        text-decoration-thickness: 1px;
      }
    }
  }

  a {
    color: ${(props) => props.theme.link};
    cursor: pointer;
  }

  .ProseMirror-focused {
    a {
      cursor: text;
    }
  }

  a:hover {
    text-decoration: ${(props) => (props.readOnly ? "underline" : "none")};
  }

  ul,
  ol {
    margin: ${(props) => (props.rtl ? "0 -26px 0 0.1em" : "0 0.1em 0 -26px")};
    padding: ${(props) => (props.rtl ? "0 44px 0 0" : "0 0 0 44px")};
  }

  ol ol {
    list-style: lower-alpha;
  }

  ol ol ol {
    list-style: lower-roman;
  }

  ul.checkbox_list {
    list-style: none;
    padding: 0;
    margin-left: ${(props) => (props.rtl ? "0" : "-24px")};
    margin-right: ${(props) => (props.rtl ? "-24px" : "0")};
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

  ul.checkbox_list li {
    display: flex;
    padding-${(props) => (props.rtl ? "right" : "left")}: 24px;
  }

  ul.checkbox_list li.checked > div > p {
    color: ${(props) => props.theme.textSecondary};
    text-decoration: line-through;
  }

  ul li::before,
  ol li::before {
    background: url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iOCIgeT0iNyIgd2lkdGg9IjMiIGhlaWdodD0iMiIgcng9IjEiIGZpbGw9IiM0RTVDNkUiLz4KPHJlY3QgeD0iOCIgeT0iMTEiIHdpZHRoPSIzIiBoZWlnaHQ9IjIiIHJ4PSIxIiBmaWxsPSIjNEU1QzZFIi8+CjxyZWN0IHg9IjgiIHk9IjE1IiB3aWR0aD0iMyIgaGVpZ2h0PSIyIiByeD0iMSIgZmlsbD0iIzRFNUM2RSIvPgo8cmVjdCB4PSIxMyIgeT0iNyIgd2lkdGg9IjMiIGhlaWdodD0iMiIgcng9IjEiIGZpbGw9IiM0RTVDNkUiLz4KPHJlY3QgeD0iMTMiIHk9IjExIiB3aWR0aD0iMyIgaGVpZ2h0PSIyIiByeD0iMSIgZmlsbD0iIzRFNUM2RSIvPgo8cmVjdCB4PSIxMyIgeT0iMTUiIHdpZHRoPSIzIiBoZWlnaHQ9IjIiIHJ4PSIxIiBmaWxsPSIjNEU1QzZFIi8+Cjwvc3ZnPgo=") no-repeat;
    background-position: 0 2px;
    content: "";
    display: ${(props) => (props.readOnly ? "none" : "inline-block")};
    cursor: grab;
    width: 24px;
    height: 24px;
    position: absolute;
    ${(props) => (props.rtl ? "right" : "left")}: -40px;
    opacity: 0;
    transition: opacity 200ms ease-in-out;
  }

  ul li[draggable=true]::before,
  ol li[draggable=true]::before {
    cursor: grabbing;
  }

  ul > li.counter-2::before,
  ol li.counter-2::before {
    ${(props) => (props.rtl ? "right" : "left")}: -50px;
  }

  ul > li.hovering::before,
  ol li.hovering::before {
    opacity: 0.5;
  }

  ul li.ProseMirror-selectednode::after,
  ol li.ProseMirror-selectednode::after {
    display: none;
  }

  ul.checkbox_list li::before {
    ${(props) => (props.rtl ? "right" : "left")}: 0;
  }

  ul.checkbox_list li .checkbox {
    display: inline-block;
    cursor: pointer;
    pointer-events: ${(props) =>
      props.readOnly && !props.readOnlyWriteCheckboxes ? "none" : "initial"};
    opacity: ${(props) =>
      props.readOnly && !props.readOnlyWriteCheckboxes ? 0.75 : 1};
    margin: ${(props) => (props.rtl ? "0 0 0 0.5em" : "0 0.5em 0 0")};
    width: 14px;
    height: 14px;
    position: relative;
    top: 1px;
    transition: transform 100ms ease-in-out;
    opacity: .8;

    background-image: ${(props) =>
      `url("data:image/svg+xml,%3Csvg width='14' height='14' viewBox='0 0 14 14' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M3 0C1.34315 0 0 1.34315 0 3V11C0 12.6569 1.34315 14 3 14H11C12.6569 14 14 12.6569 14 11V3C14 1.34315 12.6569 0 11 0H3ZM3 2C2.44772 2 2 2.44772 2 3V11C2 11.5523 2.44772 12 3 12H11C11.5523 12 12 11.5523 12 11V3C12 2.44772 11.5523 2 11 2H3Z' fill='${props.theme.text.replace(
        "#",
        "%23"
      )}' /%3E%3C/svg%3E%0A");`}

    &[aria-checked=true] {
      opacity: 1;
      background-image: ${(props) =>
        `url(
          "data:image/svg+xml,%3Csvg width='14' height='14' viewBox='0 0 14 14' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M3 0C1.34315 0 0 1.34315 0 3V11C0 12.6569 1.34315 14 3 14H11C12.6569 14 14 12.6569 14 11V3C14 1.34315 12.6569 0 11 0H3ZM4.26825 5.85982L5.95873 7.88839L9.70003 2.9C10.0314 2.45817 10.6582 2.36863 11.1 2.7C11.5419 3.03137 11.6314 3.65817 11.3 4.1L6.80002 10.1C6.41275 10.6164 5.64501 10.636 5.2318 10.1402L2.7318 7.14018C2.37824 6.71591 2.43556 6.08534 2.85984 5.73178C3.28412 5.37821 3.91468 5.43554 4.26825 5.85982Z' fill='${props.theme.primary.replace(
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
    border-top: 1px solid ${(props) => props.theme.horizontalRule};
    top: 0.5em;
    left: 0;
    right: 0;
  }

  hr.page-break {
    page-break-after: always;
  }

  hr.page-break:before {
    border-top: 1px dashed ${(props) => props.theme.horizontalRule};
  }

  code {
    border-radius: 4px;
    border: 1px solid ${(props) => props.theme.codeBorder};
    background: ${(props) => props.theme.codeBackground};
    padding: 3px 4px;
    font-family: ${(props) => props.theme.fontFamilyMono};
    font-size: 80%;
  }

  mark {
    border-radius: 1px;
    color: ${(props) => props.theme.textHighlightForeground};
    background: ${(props) => props.theme.textHighlight};

    a {
      color: ${(props) => props.theme.textHighlightForeground};
    }
  }

  .external-link {
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
    ${(props) => (props.rtl ? "left" : "right")}: 8px;
  }

  .code-block,
  .notice-block {
    position: relative;

    select,
    button {
      margin: 0;
      padding: 0;
      border: 0;
      background: ${(props) => props.theme.buttonNeutralBackground};
      color: ${(props) => props.theme.buttonNeutralText};
      box-shadow: rgba(0, 0, 0, 0.07) 0px 1px 2px, ${(props) =>
        props.theme.buttonNeutralBorder} 0 0 0 1px inset;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      text-decoration: none;
      flex-shrink: 0;
      cursor: pointer;
      user-select: none;
      appearance: none !important;
      padding: 6px 8px;
      display: none;

      &::-moz-focus-inner {
        padding: 0;
        border: 0;
      }

      &:hover:not(:disabled) {
        background-color: ${(props) =>
          darken(0.05, props.theme.buttonNeutralBackground)};
        box-shadow: rgba(0, 0, 0, 0.07) 0px 1px 2px, ${(props) =>
          props.theme.buttonNeutralBorder} 0 0 0 1px inset;
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
        display: ${(props) => (props.readOnly ? "none" : "inline")};
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

  .mermaid-diagram-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${(props) => props.theme.codeBackground};
    border-radius: 6px;
    border: 1px solid ${(props) => props.theme.codeBorder};
    padding: 8px;
    user-select: none;
    cursor: default;

    * {
      font-family: ${(props) => props.theme.fontFamily};
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
    background: ${(props) => props.theme.codeBackground};
    border-radius: 4px;
    border: 1px solid ${(props) => props.theme.codeBorder};
    margin: .5em 0;

    -webkit-font-smoothing: initial;
    font-family: ${(props) => props.theme.fontFamilyMono};
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
    color: ${(props) => props.theme.code};

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
    color: ${(props) => props.theme.codeComment};
  }

  .token.punctuation {
    color: ${(props) => props.theme.codePunctuation};
  }

  .token.namespace {
    opacity: 0.7;
  }

  .token.operator,
  .token.boolean,
  .token.number {
    color: ${(props) => props.theme.codeNumber};
  }

  .token.property {
    color: ${(props) => props.theme.codeProperty};
  }

  .token.tag {
    color: ${(props) => props.theme.codeTag};
  }

  .token.string {
    color: ${(props) => props.theme.codeString};
  }

  .token.selector {
    color: ${(props) => props.theme.codeSelector};
  }

  .token.attr-name {
    color: ${(props) => props.theme.codeAttr};
  }

  .token.entity,
  .token.url,
  .language-css .token.string,
  .style .token.string {
    color: ${(props) => props.theme.codeEntity};
  }

  .token.attr-value,
  .token.keyword,
  .token.control,
  .token.directive,
  .token.unit {
    color: ${(props) => props.theme.codeKeyword};
  }

  .token.function {
    color: ${(props) => props.theme.codeFunction};
  }

  .token.statement,
  .token.regex,
  .token.atrule {
    color: ${(props) => props.theme.codeStatement};
  }

  .token.placeholder,
  .token.variable {
    color: ${(props) => props.theme.codePlaceholder};
  }

  .token.deleted {
    text-decoration: line-through;
  }

  .token.inserted {
    border-bottom: 1px dotted ${(props) => props.theme.codeInserted};
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
    color: ${(props) => props.theme.codeImportant};
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
      border-bottom: 1px solid ${(props) => props.theme.tableDivider};
    }

    th {
      background: ${(props) => props.theme.tableHeaderBackground};
    }

    td,
    th {
      position: relative;
      vertical-align: top;
      border: 1px solid ${(props) => props.theme.tableDivider};
      position: relative;
      padding: 4px 8px;
      text-align: ${(props) => (props.rtl ? "right" : "left")};
      min-width: 100px;
    }

    .selectedCell {
      background: ${(props) =>
        props.readOnly ? "inherit" : props.theme.tableSelectedBackground};

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
        cursor: pointer;
        position: absolute;
        top: -16px;
        ${(props) => (props.rtl ? "right" : "left")}: 0;
        width: 100%;
        height: 12px;
        background: ${(props) => props.theme.tableDivider};
        border-bottom: 3px solid ${(props) => props.theme.background};
        display: ${(props) => (props.readOnly ? "none" : "block")};
      }

      &:hover::after {
        background: ${(props) => props.theme.text};
      }
      &.first::after {
        border-top-${(props) => (props.rtl ? "right" : "left")}-radius: 3px;
      }
      &.last::after {
        border-top-${(props) => (props.rtl ? "left" : "right")}-radius: 3px;
      }
      &.selected::after {
        background: ${(props) => props.theme.tableSelected};
      }
    }

    .grip-row {
      &::after {
        content: "";
        cursor: pointer;
        position: absolute;
        ${(props) => (props.rtl ? "right" : "left")}: -16px;
        top: 0;
        height: 100%;
        width: 12px;
        background: ${(props) => props.theme.tableDivider};
        border-${(props) => (props.rtl ? "left" : "right")}: 3px solid;
        border-color: ${(props) => props.theme.background};
        display: ${(props) => (props.readOnly ? "none" : "block")};
      }

      &:hover::after {
        background: ${(props) => props.theme.text};
      }
      &.first::after {
        border-top-${(props) => (props.rtl ? "right" : "left")}-radius: 3px;
      }
      &.last::after {
        border-bottom-${(props) => (props.rtl ? "right" : "left")}-radius: 3px;
      }
      &.selected::after {
        background: ${(props) => props.theme.tableSelected};
      }
    }

    .grip-table {
      &::after {
        content: "";
        cursor: pointer;
        background: ${(props) => props.theme.tableDivider};
        width: 13px;
        height: 13px;
        border-radius: 13px;
        border: 2px solid ${(props) => props.theme.background};
        position: absolute;
        top: -18px;
        ${(props) => (props.rtl ? "right" : "left")}: -18px;
        display: ${(props) => (props.readOnly ? "none" : "block")};
      }

      &:hover::after {
        background: ${(props) => props.theme.text};
      }
      &.selected::after {
        background: ${(props) => props.theme.tableSelected};
      }
    }
  }

  .scrollable-wrapper {
    position: relative;
    margin: 0.5em 0px;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;

    &:hover {
      scrollbar-color: ${(props) => props.theme.scrollbarThumb} ${(props) =>
  props.theme.scrollbarBackground};
    }

    & ::-webkit-scrollbar {
      height: 14px;
      background-color: transparent;
    }

    &:hover ::-webkit-scrollbar {
      background-color: ${(props) => props.theme.scrollbarBackground};
    }

    & ::-webkit-scrollbar-thumb {
      background-color: transparent;
      border: 3px solid transparent;
      border-radius: 7px;
    }

    &:hover ::-webkit-scrollbar-thumb {
      background-color: ${(props) => props.theme.scrollbarThumb};
      border-color: ${(props) => props.theme.scrollbarBackground};
    }
  }

  .scrollable {
    overflow-y: hidden;
    overflow-x: auto;
    padding-${(props) => (props.rtl ? "right" : "left")}: 1em;
    margin-${(props) => (props.rtl ? "right" : "left")}: -1em;
    border-${(props) => (props.rtl ? "right" : "left")}: 1px solid transparent;
    border-${(props) => (props.rtl ? "left" : "right")}: 1px solid transparent;
    transition: border 250ms ease-in-out 0s;
  }

  .scrollable-shadow {
    position: absolute;
    top: 0;
    bottom: 0;
    ${(props) => (props.rtl ? "right" : "left")}: -1em;
    width: 16px;
    transition: box-shadow 250ms ease-in-out;
    border: 0px solid transparent;
    border-${(props) => (props.rtl ? "right" : "left")}-width: 1em;
    pointer-events: none;

    &.left {
      box-shadow: 16px 0 16px -16px inset rgba(0, 0, 0, 0.25);
      border-left: 1em solid ${(props) => props.theme.background};
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
    display: ${(props) => (props.readOnly ? "none" : "inline")};
    width: 24px;
    height: 24px;
    color: ${(props) => props.theme.textSecondary};
    background: none;
    position: absolute;
    transition: color 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275),
      opacity 150ms ease-in-out;
    outline: none;
    border: 0;
    padding: 0;
    margin-top: 1px;
    margin-${(props) => (props.rtl ? "right" : "left")}: -28px;
    border-radius: 4px;

    &:hover,
    &:focus {
      cursor: pointer;
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.secondaryBackground};
    }
  }

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
    border-top: 1px solid ${(props) => props.theme.cursor};
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

  @media print {
    .placeholder:before,
    .block-menu-trigger,
    .heading-actions,
    h1:not(.placeholder):before,
    h2:not(.placeholder):before,
    h3:not(.placeholder):before,
    h4:not(.placeholder):before,
    h5:not(.placeholder):before,
    h6:not(.placeholder):before {
      display: none;
    }

    .page-break {
      opacity: 0;
    }

    em,
    blockquote {
      font-family: "SF Pro Text", ${(props) => props.theme.fontFamily};
    }
  }
`;

export default EditorStyles;
