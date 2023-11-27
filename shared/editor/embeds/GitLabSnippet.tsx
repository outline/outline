import * as React from "react";
import styled from "styled-components";
import { EmbedProps as Props } from ".";

const GITLAB_NAMESPACE_REGEX = "(([a-zA-Z\\d-]+)/)";

const Iframe = styled.iframe`
  margin-top: 8px;
`;

function GitLabSnippet(props: Props) {
  const snippetUrl = new URL(props.attrs.href);
  const id = snippetUrl.pathname.split("/").pop();
  const snippetLink = `${snippetUrl}.js`;
  const snippetScript = `<script type="text/javascript" src="${snippetLink}"></script>`;
  const styles = "<style>body { margin: 0; }</style>";
  const iframeHtml = `<html><head><base target="_parent">${styles}</head><body>${snippetScript}</body></html>`;

  return (
    <Iframe
      src={`data:text/html;base64,${btoa(iframeHtml)}`}
      className={props.isSelected ? "ProseMirror-selectednode" : ""}
      frameBorder="0"
      width="100%"
      height="400px"
      id={`gitlab-snippet-${id}`}
      title="GitLab Snippet"
    />
  );
}

GitLabSnippet.ENABLED = [
  new RegExp(
    `^https://gitlab\\.com/${GITLAB_NAMESPACE_REGEX}*-/snippets/\\d+$`
  ),
];

export default GitLabSnippet;
