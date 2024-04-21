import * as React from "react";
import Frame, { resizeObserverScript } from "../components/Frame";
import { EmbedProps as Props } from ".";

function GitLabSnippet(props: Props) {
  const frame = React.useRef(null);
  const [height, setHeight] = React.useState(400);
  const snippetUrl = new URL(props.attrs.href);
  const id = snippetUrl.pathname.split("/").pop();
  const snippetLink = `${snippetUrl}.js`;
  const snippetScript = `<script type="text/javascript" src="${snippetLink}"></script>${resizeObserverScript}`;
  const styles =
    "<style>body { margin: 0; .gitlab-embed-snippets { margin: 0; } }</style>";
  const iframeHtml = `<html><head><base target="_parent">${styles}</head><body>${snippetScript}</body></html>`;

  React.useEffect(() => {
    const handler = (event: MessageEvent<{ type: string; value: number }>) => {
      if (event.data.type === "frame-resized") {
        setHeight(event.data.value);
      }
    };
    window.addEventListener("message", handler);

    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <Frame
      ref={frame}
      src={`data:text/html;base64,${btoa(iframeHtml)}`}
      className={props.isSelected ? "ProseMirror-selectednode" : ""}
      width="100%"
      height={`${height}px`}
      id={`gitlab-snippet-${id}`}
      title="GitLab Snippet"
      dangerouslySkipSanitizeSrc
    />
  );
}

export default GitLabSnippet;
