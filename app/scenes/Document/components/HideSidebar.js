// @flow
import * as React from 'react';
import UiStore from 'stores/UiStore';

type Props = {
  ui: UiStore,
  children?: React.Node,
};

class HideSidebar extends React.Component<Props> {
  componentDidMount() {
    this.props.ui.enableEditMode();
  }

  componentWillUnmount() {
    this.props.ui.disableEditMode();
  }

  render() {
    return this.props.children || null;
  }
}

export default HideSidebar;
