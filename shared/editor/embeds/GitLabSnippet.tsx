import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function GitLabSnippet(props: Props) {
  const frame = React.useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = React.useState(400);

  React.useEffect(() => {
    const handler = (event: MessageEvent<{ type: string; value: number }>) => {
      const contentWindow =
        frame.current?.contentWindow ||
        frame.current?.contentDocument?.defaultView;
      if (
        event.data.type === "frame-resized" &&
        event.source === contentWindow
      ) {
        setHeight(event.data.value);
      }
    };
    window.addEventListener("message", handler);

    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <Frame
      ref={frame}
      src={`/embeds/gitlab?url=${encodeURIComponent(props.attrs.href)}`}
      className={props.isSelected ? "ProseMirror-selectednode" : ""}
      width="100%"
      height={`${height}px`}
      title="GitLab Snippet"
    />
  );
}

export default GitLabSnippet;
