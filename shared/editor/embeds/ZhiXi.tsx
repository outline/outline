import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function ZhiXi(props: Props) {
  const { matches } = props.attrs;
  const viewType = matches[1];
  const shareId = matches[2];
  return (
    <Frame
      {...props}
      src={`https://www.zhixi.com/${viewType}/${shareId}`}
      title={`ZhiXi (${shareId})`}
    />
  );
}

ZhiXi.ENABLED = [
  /(?:https?:\/\/)?www\.zhixi\.com\/(view|embed)\/([a-zA-Z0-9_-]{5,15})$/i,
];

export default ZhiXi;
