import React from 'react';
import { observer, inject } from 'mobx-react';
import { browserHistory } from 'react-router';

import { Flex } from 'reflexbox';
import Layout from 'components/Layout';
import CenteredContent from 'components/CenteredContent';
import SlackAuthLink from 'components/SlackAuthLink';
import Alert from 'components/Alert';

import styles from './Home.scss';

@inject('user')
@observer
export default class Home extends React.Component {
  static propTypes = {
    user: React.PropTypes.object.isRequired,
    location: React.PropTypes.object.isRequired,
  };

  componentDidMount = () => {
    if (this.props.user.authenticated) {
      browserHistory.replace('/dashboard');
    }
  };

  get notifications() {
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
        <Layout notifications={this.notifications}>
          <CenteredContent>
            {showLandingPageCopy &&
              <div className={styles.intro}>
                <h1 className={styles.title}>Simple, fast, markdown.</h1>
                <p className={styles.copy}>
                  We're building a modern wiki for engineering teams.
                </p>
              </div>}
            <div className={styles.action}>
              <SlackAuthLink redirectUri={`${URL}/auth/slack`}>
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
        </Layout>
      </Flex>
    );
  }
}
