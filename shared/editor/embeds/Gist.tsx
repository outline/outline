import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Gist(props: Props) {
  const gistUrl = new URL(props.attrs.href);
  const id = gistUrl.pathname.split("/")[2];
  const gistLink = `https://gist.github.com/${id}.js`;
  const gistScript = `<script type="text/javascript" src="${gistLink}"></script>`;
  const styles =
    "<style>*{ font-size:12px; } body { margin: 0; } .gist .blob-wrapper.data { max-height:300px; overflow:auto; }</style>";
  const iframeHtml = `<html><head><base target="_parent">${styles}</head><body>${gistScript}</body></html>`;

  return (
    <Frame
      src={`data:text/html;base64,${btoa(iframeHtml)}`}
      className={props.isSelected ? "ProseMirror-selectednode" : ""}
      width="100%"
      height="355px"
      id={`gist-${id}`}
      title="GitHub Gist"
      dangerouslySkipSanitizeSrc
    />
  );
}

export default Gist;
