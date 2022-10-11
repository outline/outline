import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Lucidchart(props: Props) {
  const { matches } = props.attrs;
  const chartId = matches.groups?.chartId;

  return (
    <Frame
      {...props}
      src={`https://lucidchart.com/documents/embeddedchart/${chartId}`}
      title="Lucidchart Embed"
    />
  );
}

Lucidchart.ENABLED = [
  /^https?:\/\/(www\.|app\.)?(lucidchart\.com|lucid\.app)\/documents\/(embeddedchart|view|edit)\/(?<chartId>[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(?:.*)?$/,
  /^https?:\/\/(www\.|app\.)?(lucid\.app|lucidchart\.com)\/lucidchart\/(?<chartId>[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\/(embeddedchart|view|edit)(?:.*)?$/,
];

export default Lucidchart;
