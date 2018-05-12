// @flow
import * as React from 'react';
import { Redirect } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import queryString from 'query-string';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { client } from 'utils/ApiClient';
import { slackAuth } from 'shared/utils/routeHelpers';

import AuthStore from 'stores/AuthStore';

type Props = {
  auth: AuthStore,
  location: Location,
};

@observer
class SlackAuth extends React.Component<Props> {
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
        // incoming webhooks from Slack
        try {
          await client.post('/auth.slackCommands', { code });
          this.redirectTo = '/settings/integrations/slack';
        } catch (e) {
          this.redirectTo = '/auth/error';
        }
      } else if (this.props.location.pathname === '/auth/slack/post') {
        // outgoing webhooks to Slack
        try {
          await client.post('/auth.slackPost', {
            code,
            collectionId: this.props.auth.oauthState,
          });
          this.redirectTo = '/settings/integrations/slack';
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
      // signing in
      window.location.href = slackAuth(this.props.auth.genOauthState());
    }
  }

  render() {
    if (this.redirectTo) return <Redirect to={this.redirectTo} />;
    return null;
  }
}

export default inject('auth')(SlackAuth);
