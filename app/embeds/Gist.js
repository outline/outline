// @flow
import * as React from 'react';

type Props = {
  url: string,
  metadata: Object,
};

class Gist extends React.Component<Props> {
  iframeNode: ?HTMLIFrameElement;

  static requestData = false;
  static hostnames = ['gist.github.com'];

  componentDidMount() {
    this.updateIframeContent();
  }

  componentDidUpdate() {
    this.updateIframeContent();
  }

  get id() {
    const gistUrl = new URL(this.props.url);
    return gistUrl.pathname.split('/')[2];
  }

  updateIframeContent() {
    const id = this.id;
    const iframe = this.iframeNode;
    if (!iframe) return;

    let doc = iframe.document;
    if (iframe.contentDocument) doc = iframe.contentDocument;
    else if (iframe.contentWindow) doc = iframe.contentWindow.document;

    const gistLink = `https://gist.github.com/${id}.js`;
    const gistScript = `<script type="text/javascript" src="${
      gistLink
    }"></script>`;
    const styles =
      '<style>*{ font-size:12px; } body { margin: 0; } .gist .blob-wrapper.data { max-height:150px; overflow:auto; }</style>';
    const iframeHtml = `<html><head><base target="_parent">${
      styles
    }</head><body>${gistScript}</body></html>`;

    doc.open();
    doc.writeln(iframeHtml);
    doc.close();
  }

  render() {
    const id = this.id;

    return (
      <iframe
        ref={ref => {
          this.iframeNode = ref;
        }}
        width="100%"
        height="200px"
        frameBorder={0}
        id={`gist-${id}`}
        title={`gist-${id}`}
      />
    );
  }
}

export default Gist;
