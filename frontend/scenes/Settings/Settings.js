import React from 'react';
import { observer } from 'mobx-react';

import { Flex } from 'reflexbox';
import Layout, { Title } from 'components/Layout';
import CenteredContent from 'components/CenteredContent';
import SlackAuthLink from 'components/SlackAuthLink';

import styles from './Settings.scss';

import SettingsStore from './SettingsStore';

@observer
class Settings extends React.Component {
  static store;

  constructor(props) {
    super(props);
    this.store = new SettingsStore();
  }

  render() {
    const title = (
      <Title>
        Settings
      </Title>
    );

    return (
      <Layout
        title={ title }
        titleText="Settings"
        search={ false }
        loading={ this.store.isFetching }
      >
        <CenteredContent>
          <h2 className={ styles.sectionHeader }>Slack</h2>

          <p>
            Connect Atlas to your Slack to instantly search for your documents
            using <code>/atlas</code> command.
          </p>
          
          <SlackAuthLink
            scopes={ ['commands'] }
            redirectUri={ `${URL}/auth/slack/commands` }
          >
            <img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" />
          </SlackAuthLink>
        </CenteredContent>
      </Layout>
    );
  }
}

export default Settings;
