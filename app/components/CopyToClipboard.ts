import copy from "copy-to-clipboard";
import * as React from "react";

type Props = {
  text: string;
  children?: React.ReactElement;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  onCopy: () => void;
};

class CopyToClipboard extends React.PureComponent<Props> {
  onClick = (ev: React.SyntheticEvent) => {
    const { text, onCopy, children } = this.props;
    const elem = React.Children.only(children);

    copy(text, {
      debug: process.env.NODE_ENV !== "production",
      format: "text/plain",
    });
    if (onCopy) {
      onCopy();
    }

    if (elem && elem.props && typeof elem.props.onClick === "function") {
      elem.props.onClick(ev);
    }
  };

  render() {
    const { text, onCopy, children, ...rest } = this.props;
    const elem = React.Children.only(children);
    if (!elem) {
      return null;
    }

    return React.cloneElement(elem, { ...rest, onClick: this.onClick });
  }
}

export default CopyToClipboard;
