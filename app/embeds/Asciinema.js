// @flow
import * as React from "react";

const URL_REGEX = new RegExp("^https://asciinema.org/a/([a-zA-Z0-9]*)$");

type Props = {|
  isSelected: boolean,
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

class Asciinema extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  updateIframeContent = (iframe: ?HTMLIFrameElement) => {
    if (!iframe) return;
    const { matches } = this.props.attrs;
    const id = matches[1];

    // $FlowFixMe
    let doc = iframe.document;
    if (iframe.contentDocument) {
      doc = iframe.contentDocument;
    } else if (iframe.contentWindow) {
      doc = iframe.contentWindow.document;
    }

    const asciinemaLink = `https://asciinema.org/a/${id}.js`;
    const asciinemaScript = `<script type="text/javascript" id="asciicast-${id}" src="${asciinemaLink}" async></script>`;
    const iframeHtml = `<html><head><base target="_parent"></head><body>${asciinemaScript}</body></html>`;

    doc.open();
    doc.writeln(iframeHtml);
    doc.close();
  };

  render() {
    const { matches } = this.props.attrs;
    const id = matches[1];

    return (
      <iframe
        className={this.props.isSelected ? "ProseMirror-selectednode" : ""}
        ref={this.updateIframeContent}
        type="text/html"
        frameBorder="0"
        width="100%"
        height="460px"
        id={`asciicast-${id}`}
        title={`Asciinema (${id})`}
      />
    );
  }
}

export default Asciinema;
