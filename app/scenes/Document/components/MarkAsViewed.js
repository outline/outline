// @flow
import * as React from "react";
import Document from "models/Document";

const MARK_AS_VIEWED_AFTER = 3 * 1000;

type Props = {|
  document: Document,
  children?: React.Node,
|};

class MarkAsViewed extends React.Component<Props> {
  viewTimeout: TimeoutID;

  componentDidMount() {
    const { document } = this.props;

    this.viewTimeout = setTimeout(() => {
      if (document.publishedAt) {
        document.view();
      }
    }, MARK_AS_VIEWED_AFTER);
  }

  componentWillUnmount() {
    clearTimeout(this.viewTimeout);
  }

  render() {
    return this.props.children || null;
  }
}

export default MarkAsViewed;
