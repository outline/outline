// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import { Redirect } from 'react-router';
import Flex from 'components/Flex';
import styled from 'styled-components';

import AuthStore from 'stores/AuthStore';

import CenteredContent from 'components/CenteredContent';
import SlackAuthLink from 'components/SlackAuthLink';
import Alert from 'components/Alert';

type Props = {
  auth: AuthStore,
  location: Object,
};

@observer class Home extends React.Component {
  props: Props;

  get notifications(): React.Element<any>[] {
    const notifications = [];
    const { state } = this.props.location;

    if (state && state.nextPathname) {
      sessionStorage.removeItem('redirectTo');
      sessionStorage.setItem('redirectTo', state.nextPathname);
      notifications.push(
        <Alert key="login" info>Please login to continue</Alert>
      );
    }

    return notifications;
  }

  render() {
    const showLandingPageCopy = DEPLOYMENT === 'hosted';

    return (
      <Flex auto>
        {this.props.auth.authenticated && <Redirect to="/dashboard" />}

        <CenteredContent>
          {showLandingPageCopy &&
            <div>
              <Title>Simple, fast, markdown.</Title>
              <Copy>
                We're building a modern wiki for engineering teams.
              </Copy>
            </div>}
          <div>
            <SlackAuthLink redirectUri={`${BASE_URL}/auth/slack`}>
              <img
                alt="Sign in with Slack"
                height="40"
                width="172"
                src="https://platform.slack-edge.com/img/sign_in_with_slack.png"
                srcSet="https://platform.slack-edge.com/img/sign_in_with_slack.png 1x, https://platform.slack-edge.com/img/sign_in_with_slack@2x.png 2x"
              />
            </SlackAuthLink>
          </div>
        </CenteredContent>
      </Flex>
    );
  }
}

const Title = styled.h1`
  font-size: 36px;
  margin-bottom: 24px;
}`;

const Copy = styled.p`
  font-size: 20px;
  margin-bottom: 36px;
}`;

export default inject('auth')(Home);
