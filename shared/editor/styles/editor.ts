import styled from "styled-components";

export const StyledEditor = styled("div")<{
  rtl: boolean;
  readOnly?: boolean;
  readOnlyWriteCheckboxes?: boolean;
}>`
  color: ${(props) => props.theme.text};
  background: ${(props) => props.theme.background};
  font-family: ${(props) => props.theme.fontFamily};
  font-weight: ${(props) => props.theme.fontWeight};
  font-size: 1em;
  line-height: 1.7em;
  width: 100%;

  .ProseMirror {
    position: relative;
    outline: none;
    word-wrap: break-word;
    white-space: pre-wrap;
    white-space: break-spaces;
    -webkit-font-variant-ligatures: none;
    font-variant-ligatures: none;
    font-feature-settings: "liga" 0; /* the above doesn't seem to work in Edge */
  }

  pre {
    white-space: pre-wrap;
  }

  li {
    position: relative;
  }

  .image {
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
    margin: 1em 0 0.5em;
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

    &:hover {
      text-decoration: none;
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
      transform: rotate(${(props) => (props.rtl ? "90deg" : "-90deg")});
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
    background: ${(props) => props.theme.noticeInfoBackground};
    color: ${(props) => props.theme.noticeInfoText};
    border-radius: 4px;
    padding: 8px 16px;
    margin: 8px 0;

    a {
      color: ${(props) => props.theme.noticeInfoText};
    }

    a:not(.heading-name) {
      text-decoration: underline;
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
    position: relative;
    top: 1px;
  }

  .notice-block.tip {
    background: ${(props) => props.theme.noticeTipBackground};
    color: ${(props) => props.theme.noticeTipText};

    a {
      color: ${(props) => props.theme.noticeTipText};
    }
  }

  .notice-block.warning {
    background: ${(props) => props.theme.noticeWarningBackground};
    color: ${(props) => props.theme.noticeWarningText};

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
  }

  a {
    color: ${(props) => props.theme.link};
    cursor: pointer;
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
    margin: ${(props) => (props.rtl ? "0 -24px 0 0" : "0 0 0 -24px")};
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

  ul.checkbox_list li input {
    cursor: pointer;
    pointer-events: ${(props) =>
      props.readOnly && !props.readOnlyWriteCheckboxes ? "none" : "initial"};
    opacity: ${(props) =>
      props.readOnly && !props.readOnlyWriteCheckboxes ? 0.75 : 1};
    margin: ${(props) => (props.rtl ? "0.5em 0 0 0.5em" : "0.5em 0.5em 0 0")};
    width: 14px;
    height: 14px;
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

  .code-block,
  .notice-block {
    position: relative;

    select,
    button {
      background: ${(props) => props.theme.blockToolbarBackground};
      color: ${(props) => props.theme.blockToolbarItem};
      border-width: 1px;
      font-size: 13px;
      display: none;
      position: absolute;
      border-radius: 4px;
      padding: 2px;
      z-index: 1;
      top: 4px;
    }

    &.code-block {
      select,
      button {
        right: 4px;
      }
    }

    &.notice-block {
      select,
      button {
        ${(props) => (props.rtl ? "left" : "right")}: 4px;
      }
    }

    button {
      padding: 2px 4px;
    }

    &:hover {
      select {
        display: ${(props) => (props.readOnly ? "none" : "inline")};
      }

      button {
        display: ${(props) => (props.readOnly ? "inline" : "none")};
      }
    }

    select:focus,
    select:active {
      display: inline;
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
    margin: 0;

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
      transform 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275),
      opacity 150ms ease-in-out;
    outline: none;
    border: 0;
    padding: 0;
    margin-top: 1px;
    margin-${(props) => (props.rtl ? "right" : "left")}: -24px;

    &:hover,
    &:focus {
      cursor: pointer;
      transform: scale(1.2);
      color: ${(props) => props.theme.text};
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
