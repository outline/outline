// @flow
import * as React from "react";
import ReactDOMServer from "react-dom/server";

const URL_REGEX = new RegExp(
  "^https?://twitter.com/([a-zA-Z0-9_]{3,15})(/(status|lists)/.+?)?$"
);

type Props = {|
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

export default class Twitter extends React.Component<Props> {
  static ENABLED = [URL_REGEX];
  frameRef = React.createRef();

  get iframe() {
    return this.frameRef.current;
  }

  get type() {
    return this.props.attrs.href.includes("/status/")
      ? this.postEmbed
      : this.feedEmbed;
  }

  embedTweet = () => {
    if (!this.iframe) return;

    const html = ReactDOMServer.renderToStaticMarkup(this.type);
    const doc = this.iframe.contentDocument;
    doc.open();
    doc.write(html);
    doc.close();

    // Watch for changes to update the iframe height
    const observer = new MutationObserver(() => {
      this.iframe.height = `${doc.body.scrollHeight}px`;
    });

    observer.observe(doc.body, { attributes: true, childList: true });
  };

  render() {
    return (
      <iframe
        title="Twitter Embed"
        className={this.props.isSelected ? "ProseMirror-selectednode" : ""}
        ref={this.frameRef}
        height="0"
        scrolling="no"
        frameBorder="0"
        onLoad={this.embedTweet}
      />
    );
  }

  get theme() {
    return this.props.theme;
  }

  get postEmbed() {
    return (
      <div>
        <style>{`
          body {
            background: ${this.theme.background};
            margin: 0;
          }

          .twitter-tweet {
            margin: 0 !important;
          }
        `}</style>
        <blockquote
          className="twitter-tweet"
          data-dnt="true"
          data-theme={this.theme.name}
        >
          <a href={this.props.attrs.href}>&#8203;</a>
        </blockquote>
        <script async src="https://platform.twitter.com/widgets.js"></script>
      </div>
    );
  }

  get feedEmbed() {
    return (
      <div>
        <style>{`
          body {
            background: ${this.theme.background};
            margin: 0;
            border: 1px solid ${this.theme.embedBorder};
            border-radius: 6px;
          }
        `}</style>
        <a
          className="twitter-timeline"
          data-dnt="true"
          data-theme={this.theme.name}
          data-height="500"
          href={this.props.attrs.href}
        >
          &#8203;
        </a>
        <script async src="https://platform.twitter.com/widgets.js"></script>
      </div>
    );
  }
}
