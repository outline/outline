// @flow
import * as React from "react";
import styled from "styled-components";
import env from "env";

const URL_REGEX = new RegExp("^https://www.dropbox.com/sh?/(.*)$");

type Props = {|
  isSelected: boolean,
  attrs: {|
    href: string,
    matches: string[],
  |},
|};

class Dropbox extends React.Component<Props> {
  static ENABLED = [URL_REGEX];

  container = React.createRef<HTMLAnchorElement>();

  shouldComponentUpdate(nextProps: Props) {
    return (
      nextProps.isSelected !== this.props.isSelected ||
      nextProps.attrs.href !== this.props.attrs.href
    );
  }

  componentDidMount() {
    if (document.getElementById("dropboxjs")) {
      if (this.container.current) {
        window.Dropbox.embed(
          { link: this.props.attrs.href },
          this.container.current
        );
      }

      return;
    }

    const tag = document.createElement("script");
    tag.async = false;
    tag.id = "dropboxjs";
    tag.setAttribute("data-app-key", env.DROPBOX_APP_KEY);
    tag.src = "https://www.dropbox.com/static/api/2/dropins.js";
    document.body?.appendChild(tag);
  }

  render() {
    return (
      <Rounded
        className={this.props.isSelected ? "ProseMirror-selectednode" : ""}
      >
        <a
          ref={this.container}
          href={this.props.attrs.href}
          className="dropbox-embed"
          data-height="400px"
        />
      </Rounded>
    );
  }
}

const Rounded = styled.div`
  border-radius: 3px;
  height: 400px;
`;

export default Dropbox;
