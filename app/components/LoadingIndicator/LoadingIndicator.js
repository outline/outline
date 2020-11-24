// @flow
import { inject, observer } from "mobx-react";
import * as React from "react";
import UiStore from "stores/UiStore";

type Props = {
  ui: UiStore,
};

@observer
class LoadingIndicator extends React.Component<Props> {
  componentDidMount() {
    this.props.ui.enableProgressBar();
  }

  componentWillUnmount() {
    this.props.ui.disableProgressBar();
  }

  render() {
    return null;
  }
}

export default inject("ui")(LoadingIndicator);
