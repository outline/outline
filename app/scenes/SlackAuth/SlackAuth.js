// @flow
import React from 'react';
import { Redirect } from 'react-router';
import queryString from 'query-string';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { client } from 'utils/ApiClient';
import { slackAuth } from 'utils/routeHelpers';

import AuthStore from 'stores/AuthStore';

type Props = {
  auth: AuthStore,
  location: Object,
};

@observer class SlackAuth extends React.Component {
  props: Props;
  @observable redirectTo: string;

  componentDidMount() {
    this.redirect();
  }

  async redirect() {
    const { error, code, state } = queryString.parse(
      this.props.location.search
    );

    if (error) {
      if (error === 'access_denied') {
        // User selected "Deny" access on Slack OAuth
        this.redirectTo = '/dashboard';
      } else {
        this.redirectTo = '/auth/error';
      }
    } else if (code) {
      if (this.props.location.pathname === '/auth/slack/commands') {
        // User adding webhook integrations
        try {
          await client.post('/auth.slackCommands', { code });
          this.redirectTo = '/dashboard';
        } catch (e) {
          this.redirectTo = '/auth/error';
        }
      } else {
        // Slack authentication
        const redirectTo = sessionStorage.getItem('redirectTo');
        sessionStorage.removeItem('redirectTo');

        const { success } = await this.props.auth.authWithSlack(code, state);
        success
          ? (this.redirectTo = redirectTo || '/dashboard')
          : (this.redirectTo = '/auth/error');
      }
    } else {
      // Sign In
      window.location.href = slackAuth(this.props.auth.getOauthState());
    }
  }

  render() {
    if (this.redirectTo) return <Redirect to={this.redirectTo} />;
    return null;
  }
}

export default inject('auth')(SlackAuth);
