// @flow
import * as React from "react";
import copy from "copy-to-clipboard";

type Props = {
  text: string,
  children?: React.Node,
  onClick?: () => void,
  onCopy: () => void,
};

class CopyToClipboard extends React.PureComponent<Props> {
  onClick = (ev: SyntheticEvent<>) => {
    const { text, onCopy, children } = this.props;
    const elem = React.Children.only(children);
    copy(text, {
      debug: process.env.NODE_ENV !== "production",
    });

    if (onCopy) onCopy();

    if (elem && elem.props && typeof elem.props.onClick === "function") {
      elem.props.onClick(ev);
    }
  };

  render() {
    const { text: _text, onCopy: _onCopy, children, ...rest } = this.props;
    const elem = React.Children.only(children);
    return React.cloneElement(elem, { ...rest, onClick: this.onClick });
  }
}

export default CopyToClipboard;
