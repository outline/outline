// @flow
import { Component } from 'react';
import { inject } from 'mobx-react';
import UiStore from 'stores/UiStore';

class SidebarHidden extends Component {
  props: {
    ui: UiStore,
    children: React$Element<any>,
  };

  componentDidMount() {
    this.props.ui.enableEditMode();
  }

  componentWillUnmount() {
    this.props.ui.disableEditMode();
  }

  render() {
    return this.props.children;
  }
}

export default inject('ui')(SidebarHidden);
