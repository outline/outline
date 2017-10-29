// @flow
import React, { Component } from 'react';
import { inject } from 'mobx-react';
import { Route } from 'react-router-dom';
import UiStore from 'stores/UiStore';

class RouteSidebarHidden extends Component {
  props: {
    ui: UiStore,
    component: any,
  };

  componentDidMount() {
    this.props.ui.enableEditMode();
  }

  componentWillUnmount() {
    this.props.ui.disableEditMode();
  }

  render() {
    const { component, ...rest } = this.props;
    const Component = component;
    return <Route {...rest} render={props => <Component {...props} />} />;
  }
}

export default inject('ui')(RouteSidebarHidden);
