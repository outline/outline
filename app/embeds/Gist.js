// @flow
import * as React from 'react';

const URL_REGEX = new RegExp(
  '^https://gist.github.com/([a-zd](?:[a-zd]|-(?=[a-zd])){0,38})/(.*)$'
);

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

class Gist extends React.Component<Props> {
  iframeNode: ?HTMLIFrameElement;

  static ENABLED = [URL_REGEX];

  componentDidMount() {
    this.updateIframeContent();
  }

  get id() {
    const gistUrl = new URL(this.props.attrs.href);
    return gistUrl.pathname.split('/')[2];
  }

  updateIframeContent() {
    const id = this.id;
    const iframe = this.iframeNode;
    if (!iframe) return;

    // $FlowFixMe
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
        type="text/html"
        frameBorder="0"
        width="100%"
        height="200px"
        id={`gist-${id}`}
        title={`Github Gist (${id})`}
      />
    );
  }
}

export default Gist;
