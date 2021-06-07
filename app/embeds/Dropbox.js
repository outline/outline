// @flow
import * as React from "react";

const URL_REGEX = new RegExp("^https://www.dropbox.com/s/(.*)$");

type Props = {|
  isSelected: boolean,
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

class Dropbox extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  container = React.createRef<HTMLElement>();

  componentDidMount() {
    var tag = document.createElement("script");
    tag.async = false;
    tag.id = "dropboxjs";
    tag.setAttribute("data-app-key", "zuf12mnhan22y62");
    tag.src = "https://www.dropbox.com/static/api/2/dropins.js";
    document.body?.appendChild(tag);
  }

  render() {
    return (
      <div>
        <a
          ref={this.container}
          href={this.props.attrs.href}
          className="dropbox-embed"
          data-height="400px"
        >
          Dropbox Embed
        </a>
      </div>
    );
  }
}

export default Dropbox;
