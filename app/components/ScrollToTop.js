// @flow
// based on: https://reacttraining.com/react-router/web/guides/scroll-restoration
import * as React from 'react';
import { withRouter } from 'react-router-dom';

class ScrollToTop extends React.Component<*> {
  componentDidUpdate(prevProps) {
    if (this.props.location.pathname === prevProps.location.pathname) return;

    // exception for when entering or exiting document edit, scroll postion should not reset
    if (
      this.props.location.pathname.match(/\/edit\/?$/) ||
      prevProps.location.pathname.match(/\/edit\/?$/)
    )
      return;

    window.scrollTo(0, 0);
  }

  render() {
    return this.props.children;
  }
}

export default withRouter(ScrollToTop);
