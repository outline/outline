import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function RealtimeBoard(props: Props) {
  const { matches } = props.attrs;
  const domain = matches[1];
  const boardId = matches[2];
  const titleName = domain === "realtimeboard" ? "RealtimeBoard" : "Miro";

  return (
    <Frame
      {...props}
      src={`https://${domain}.com/app/embed/${boardId}`}
      title={`${titleName} (${boardId})`}
    />
  );
}

RealtimeBoard.ENABLED = [
  /^https:\/\/(realtimeboard|miro)\.com\/app\/board\/(.*)$/,
];

export default RealtimeBoard;
