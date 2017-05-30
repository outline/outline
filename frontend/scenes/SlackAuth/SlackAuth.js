// @flow
import React from 'react';
import { Redirect } from 'react-router';
import queryString from 'query-string';
import { observer, inject } from 'mobx-react';
import { client } from 'utils/ApiClient';

import AuthStore from 'stores/AuthStore';

type Props = {
  auth: AuthStore,
  location: Object,
};

type State = {
  redirectTo: string,
};

@observer class SlackAuth extends React.Component {
  props: Props;
  state: State;
  state = {};

  // $FlowIssue Flow doesn't like async lifecycle components https://github.com/facebook/flow/issues/1803
  async componentDidMount(): void {
    const { error, code, state } = queryString.parse(
      this.props.location.search
    );

    if (error) {
      if (error === 'access_denied') {
        // User selected "Deny" access on Slack OAuth
        this.setState({ redirectTo: '/dashboard' });
      } else {
        this.setState({ redirectTo: '/auth/error' });
      }
    } else {
      if (this.props.location.pathname === '/auth/slack/commands') {
        // User adding webhook integrations
        try {
          await client.post('/auth.slackCommands', { code });
          this.setState({ redirectTo: '/dashboard' });
        } catch (e) {
          this.setState({ redirectTo: '/auth/error' });
        }
      } else {
        // Regular Slack authentication
        const redirectTo = sessionStorage.getItem('redirectTo');
        sessionStorage.removeItem('redirectTo');

        const { success } = await this.props.auth.authWithSlack(code, state);
        success
          ? this.setState({ redirectTo: redirectTo || '/dashboard' })
          : this.setState({ redirectTo: '/auth/error' });
      }
    }
  }

  render() {
    return (
      <div>
        {this.state.redirectTo && <Redirect to={this.state.redirectTo} />}
      </div>
    );
  }
}

export default inject('auth')(SlackAuth);
