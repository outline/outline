import * as React from "react";
import styled from "styled-components";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Pinterest(props: Props) {
  const { matches } = props.attrs;
  const shareId = matches[1];
  return (
    <PinterestFrame
      {...props}
      src={`https://assets.pinterest.com/ext/embed.html?id=${shareId}`}
      title="Pinterest"
      height="550px"
      width="345px"
    />
  );
}

const PinterestFrame = styled(Frame)`
  border-radius: 32px;
`;

Pinterest.ENABLED = [/^https?:\/\/?(?:[\w-]+\.pinterest\.com\/pin\/(\d+)\/)/];

export default Pinterest;
