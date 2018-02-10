// @flow
import * as React from 'react';
import { withRouter } from 'react-router-dom';

class RecordPageview extends React.Component {
  componentDidUpdate(prevProps) {
    // account for adblocking / privacy extensions making ga unavailable
    if (!window.ga) return;

    if (this.props.location.pathname !== prevProps.location.pathname) {
      window.ga('send', 'pageview', this.props.location.pathname);
    }
  }

  render() {
    return this.props.children;
  }
}

export default withRouter(RecordPageview);
