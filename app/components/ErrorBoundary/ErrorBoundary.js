// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { observable } from 'mobx';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';

@observer
class ErrorBoundary extends Component {
  @observable error: boolean = false;

  componentWillReceiveProps(nextProps: Object) {
    if (
      (this.props.location || nextProps.location) &&
      this.props.location.pathname !== nextProps.location.pathname
    )
      this.error = false;
  }

  componentDidCatch(error: Error, info: Object) {
    this.error = true;

    // Error handler is often blocked by the browser
    if (window.Bugsnag) {
      Bugsnag.notifyException(error, { react: info });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.error) {
      return (
        <CenteredContent>
          <PageTitle title="Something went wrong" />
          <h1>🛸 Something unexpected happened</h1>
          <p>
            An unrecoverable error occurred{window.Bugsnag ||
              (true && ' and our engineers have been notified')}. Please try{' '}
            <a onClick={this.handleReload}>reloading</a>.
          </p>
        </CenteredContent>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
