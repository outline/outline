// @flow
import * as React from 'react';
import { withRouter } from 'react-router-dom';

class ScrollToAnchor extends React.Component<*> {
  componentDidUpdate(prevProps) {
    if (this.props.location.hash === prevProps.location.hash) return;
    if (window.location.hash === '') return;

    // Delay on timeout to ensure that the DOM is updated first
    setImmediate(() => {
      const id = window.location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) element.scrollIntoView();
    });
  }

  render() {
    return this.props.children;
  }
}

export default withRouter(ScrollToAnchor);
