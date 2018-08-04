// @flow
import * as React from 'react';
import { observer } from 'mobx-react';
import { observable } from 'mobx';
import HelpText from 'components/HelpText';
import Button from 'components/Button';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import { githubIssuesUrl } from '../../shared/utils/routeHelpers';

type Props = {
  children: React.Node,
};

@observer
class ErrorBoundary extends React.Component<Props> {
  @observable error: boolean = false;

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

  contactSupport = () => {
    window.open(githubIssuesUrl());
  };

  render() {
    if (this.error) {
      const isReported = !!window.Bugsnag;

      return (
        <CenteredContent>
          <PageTitle title="Something Unexpected Happened" />
          <h1>Something Unexpected Happened</h1>
          <HelpText>
            Sorry, an unrecoverable error occurred{isReported &&
              ' – our engineers have been notified'}. Please try reloading the
            page, it may have been a temporary glitch.
          </HelpText>
          <p>
            <Button onClick={this.handleReload}>Reload</Button>{' '}
            {DEPLOYMENT === 'hosted' && (
              <Button onClick={this.contactSupport} light>
                Report Bug…
              </Button>
            )}
          </p>
        </CenteredContent>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
