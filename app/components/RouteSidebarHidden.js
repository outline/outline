// @flow
import * as React from 'react';
import { inject } from 'mobx-react';
import { Route } from 'react-router-dom';
import UiStore from 'stores/UiStore';

type Props = {
  ui: UiStore,
  component: React.ComponentType<any>,
};

class RouteSidebarHidden extends React.Component<Props> {
  componentDidMount() {
    this.props.ui.enableEditMode();
  }

  componentWillUnmount() {
    this.props.ui.disableEditMode();
  }

  render() {
    const { component, ui, ...rest } = this.props;
    const Component = component;
    return <Route {...rest} render={props => <Component {...props} />} />;
  }
}

export default inject('ui')(RouteSidebarHidden);
