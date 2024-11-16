import * as React from "react";
import styled from "styled-components";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Pinterest({ matches, ...props }: Props) {
  const boardUrl = props.attrs.href;
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
    <PinterestFrame
      {...props}
      ref={frame}
      src={`/embeds/pinterest?url=${encodeURIComponent(boardUrl)}`}
      title="Pinterest Content"
      height={`${height}px`}
      width="100%"
    />
  );
}

const PinterestFrame = styled(Frame)`
  border-radius: 18px;
`;

export default Pinterest;
