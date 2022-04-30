import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

export default class Lucidchart extends React.Component<Props> {
  static ENABLED = [
    /^https?:\/\/(www\.|app\.)?(lucidchart\.com|lucid\.app)\/documents\/(embeddedchart|view|edit)\/(?<chartId>[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(?:.*)?$/,
    /^https?:\/\/(www\.|app\.)?(lucid\.app|lucidchart\.com)\/lucidchart\/(?<chartId>[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\/(embeddedchart|view|edit)(?:.*)?$/,
  ];

  render() {
    const { matches } = this.props.attrs;
    const chartId = matches.groups?.chartId;

    return (
      <Frame
        {...this.props}
        src={`https://lucidchart.com/documents/embeddedchart/${chartId}`}
        title="Lucidchart Embed"
      />
    );
  }
}
