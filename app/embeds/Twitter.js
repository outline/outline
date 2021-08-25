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

  get theme() {
    return this.props.theme.name;
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

    // Change iframe background color to seamlessly fit into the page
    if (this.theme === "dark") {
      doc.body.style.backgroundColor = this.props.theme.almostBlack;
    }

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
        width="100%"
        height="0"
        scrolling="no"
        frameBorder="0"
        onLoad={this.embedTweet}
      />
    );
  }

  get postEmbed() {
    return (
      <div>
        <blockquote
          className="twitter-tweet"
          data-dnt="true"
          data-theme={this.theme}
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
        <a
          className="twitter-timeline"
          data-dnt="true"
          data-theme={this.theme}
          data-height="600"
          data-width="550"
          href={this.props.attrs.href}
        >
          &#8203;
        </a>
        <script async src="https://platform.twitter.com/widgets.js"></script>
      </div>
    );
  }
}
