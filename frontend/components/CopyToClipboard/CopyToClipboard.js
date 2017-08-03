// @flow
import React, { PureComponent } from 'react';
import copy from 'copy-to-clipboard';

class CopyToClipboard extends PureComponent {
  props: {
    text: string,
    children?: React.Element<any>,
    onClick?: () => void,
    onCopy: (string, boolean) => void,
  };

  onClick = (ev: SyntheticEvent) => {
    const { text, onCopy, children } = this.props;
    const elem = React.Children.only(children);
    const result = copy(text, {
      debug: __DEV__,
    });

    if (onCopy) {
      onCopy(text, result);
    }

    if (elem && elem.props && typeof elem.props.onClick === 'function') {
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
