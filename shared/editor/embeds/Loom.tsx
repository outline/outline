import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Loom(props: Props) {
  const normalizedUrl = props.attrs.href.replace("share", "embed");
  return <Frame {...props} src={normalizedUrl} title="Loom Embed" />;
}

Loom.ENABLED = [/^https:\/\/(www\.)?(use)?loom\.com\/(embed|share)\/(.*)$/];

export default Loom;
