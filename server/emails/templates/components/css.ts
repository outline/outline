import { transparentize } from "polished";
import theme from "@shared/styles/theme";

export const css = `
  .content-diff {
    font-family: ${theme.fontFamily};
    font-weight: ${theme.fontWeight};
    font-size: 1em;
    line-height: 1.7em;
  }

  pre {
    white-space: pre-wrap;
  }

  .content-diff img {
    text-align: center;
    max-width: 100%;
    max-height: 75vh;
    clear: both;
  }
  .content-diff img.image-right-50 {
    float: right;
    width: 50%;
    margin-left: 2em;
    margin-bottom: 1em;
    clear: initial;
  }
  .content-diff img.image-left-50 {
    float: left;
    width: 50%;
    margin-right: 2em;
    margin-bottom: 1em;
    clear: initial;
  }
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin: 1em 0 0.5em;
    font-weight: 500;
  }
  .notice {
    display: flex;
    align-items: center;
    background: ${transparentize(0.9, theme.noticeInfoBackground)};
    border-left: 4px solid ${theme.noticeInfoBackground};
    color: ${theme.noticeInfoText};
    border-radius: 4px;
    padding: 8px 10px 8px 8px;
    margin: 8px 0;
  }
  .notice-tip {
    background: ${transparentize(0.9, theme.noticeTipBackground)};
    border-left: 4px solid ${theme.noticeTipBackground};
    color: ${theme.noticeTipText};
  }
  .notice-warning {
    background: ${transparentize(0.9, theme.noticeWarningBackground)};
    border-left: 4px solid ${theme.noticeWarningBackground};
    color: ${theme.noticeWarningText};
  }
  b,
  strong {
    font-weight: 600;
  }
  p {
    margin: 0;
  }
  a {
    color: ${theme.link};
  }
  ins {
    background-color: #128a2929;
    text-decoration: none;
  }
  del {
    background-color: ${theme.slateLight};
    color: ${theme.slate};
    text-decoration: strikethrough;
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
    border-top: 1px solid ${theme.horizontalRule};
    top: 0.5em;
    left: 0;
    right: 0;
  }
  hr.page-break {
    page-break-after: always;
  }
  hr.page-break:before {
    border-top: 1px dashed ${theme.horizontalRule};
  }
  code {
    border-radius: 4px;
    border: 1px solid ${theme.codeBorder};
    padding: 3px 4px;
    font-family: ${theme.fontFamilyMono};
    font-size: 85%;
  }
  mark {
    border-radius: 1px;
    color: ${theme.textHighlightForeground};
    background: ${theme.textHighlight};
    a {
      color: ${theme.textHighlightForeground};
    }
  }
  ul {
    padding-left: 0;
  }
  .checkbox-list-item {
    list-style: none;
    padding: 4px 0;
    margin: 0;
  }
  .checkbox {
    font-size: 0;
    display: block;
    float: left;
    white-space: nowrap;
    width: 12px;
    height: 12px;
    margin-top: 2px;
    margin-right: 8px;
    border: 1px solid ${theme.textSecondary};
    border-radius: 3px;
  }
  pre {
    display: block;
    overflow-x: auto;
    padding: 0.75em 1em;
    line-height: 1.4em;
    position: relative;
    background: ${theme.codeBackground};
    border-radius: 4px;
    border: 1px solid ${theme.codeBorder};
    -webkit-font-smoothing: initial;
    font-family: ${theme.fontFamilyMono};
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
    margin: 0;
  }

  pre code {
    font-size: 13px;
    background: none;
    padding: 0;
    border: 0;
  }

  blockquote {
    margin: 0;
    padding-left: 1.5em;
    font-style: italic;
    overflow: hidden;
    position: relative;
  }

  blockquote:before {
    content: "";
    display: inline-block;
    width: 2px;
    border-radius: 1px;
    position: absolute;
    top: 0;
    bottom: 0;
    background: ${theme.quote};
  }

  .content-diff table {
    width: 100%;
    border-collapse: collapse;
    border-radius: 4px;
    margin-top: 1em;
    box-sizing: border-box;
  }
  
  .content-diff table * {
    box-sizing: border-box;
  }
  
  .content-diff  table tr {
    position: relative;
    border-bottom: 1px solid ${theme.tableDivider};
  }
  
  .content-diff table td,
  .content-diff table th {
    position: relative;
    vertical-align: top;
    border: 1px solid ${theme.tableDivider};
    position: relative;
    padding: 4px 8px;
    min-width: 100px;
  }
`;
