import * as React from "react";
import styled from "styled-components";
import { EmbedProps as Props } from ".";

const URL_REGEX = new RegExp(
  "^https://gist\\.github\\.com/([a-zA-Z\\d](?:[a-zA-Z\\d]|-(?=[a-zA-Z\\d])){0,38})/(.*)$"
);

class Gist extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  get id() {
    const gistUrl = new URL(this.props.attrs.href);
    return gistUrl.pathname.split("/")[2];
  }

  render() {
    const id = this.id;
    const gistLink = `https://gist.github.com/${id}.js`;
    const gistScript = `<script type="text/javascript" src="${gistLink}"></script>`;
    const styles =
      "<style>*{ font-size:12px; } body { margin: 0; } .gist .blob-wrapper.data { max-height:150px; overflow:auto; }</style>";
    const iframeHtml = `<html><head><base target="_parent">${styles}</head><body>${gistScript}</body></html>`;

    return (
      <Iframe
        src={`data:text/html;base64,${btoa(iframeHtml)}`}
        className={this.props.isSelected ? "ProseMirror-selectednode" : ""}
        frameBorder="0"
        width="100%"
        height="200px"
        scrolling="no"
        id={`gist-${id}`}
        title="Github Gist"
      />
    );
  }
}

const Iframe = styled.iframe`
  margin-top: 8px;
`;

export default Gist;
