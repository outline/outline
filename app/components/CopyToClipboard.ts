import copy from "copy-to-clipboard";
import * as React from "react";

type Props = {
  text: string;
  children?: React.ReactNode;
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
    if (onCopy) onCopy();

    // @ts-expect-error ts-migrate(2339) FIXME: Property 'props' does not exist on type 'true | Re... Remove this comment to see the full error message
    if (elem && elem.props && typeof elem.props.onClick === "function") {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'props' does not exist on type 'true | Re... Remove this comment to see the full error message
      elem.props.onClick(ev);
    }
  };

  render() {
    const { text: _text, onCopy: _onCopy, children, ...rest } = this.props;
    const elem = React.Children.only(children);
    // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
    return React.cloneElement(elem, { ...rest, onClick: this.onClick });
  }
}

export default CopyToClipboard;
