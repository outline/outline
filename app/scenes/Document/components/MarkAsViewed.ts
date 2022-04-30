import * as React from "react";
import Document from "~/models/Document";

const MARK_AS_VIEWED_AFTER = 3 * 1000;
type Props = {
  document: Document;
};

class MarkAsViewed extends React.Component<Props> {
  viewTimeout: ReturnType<typeof setTimeout>;

  componentDidMount() {
    const { document } = this.props;
    this.viewTimeout = setTimeout(async () => {
      const view = await document.view();

      if (view) {
        document.updateLastViewed(view);
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
