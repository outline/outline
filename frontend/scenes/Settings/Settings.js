import React from 'react';
import { observer } from 'mobx-react';

import { Flex } from 'reflexbox';
import { Input, ButtonOutline, InlineForm } from 'rebass';
import Layout, { Title } from 'components/Layout';
import CenteredContent from 'components/CenteredContent';
import SlackAuthLink from 'components/SlackAuthLink';
import ApiKeyRow from './components/ApiKeyRow';

import styles from './Settings.scss';

import SettingsStore from './SettingsStore';

@observer class Settings extends React.Component {
  static store;

  constructor(props) {
    super(props);
    this.store = new SettingsStore();
  }

  onKeyCreate = e => {
    e.preventDefault();
    this.store.createApiKey();
  };

  render() {
    const title = (
      <Title>
        Settings
      </Title>
    );

    const showSlackSettings = DEPLOYMENT === 'hosted';

    return (
      <Layout
        title={title}
        titleText="Settings"
        search={false}
        loading={this.store.isFetching}
      >
        <CenteredContent>
          {showSlackSettings &&
            <div className={styles.section}>
              <h2 className={styles.sectionHeader}>Slack</h2>
              <p>
                Connect Atlas to your Slack to instantly search for your documents
                using <code>/atlas</code> command.
              </p>

              <SlackAuthLink
                scopes={['commands']}
                redirectUri={`${URL}/auth/slack/commands`}
              >
                <img
                  alt="Add to Slack"
                  height="40"
                  width="139"
                  src="https://platform.slack-edge.com/img/add_to_slack.png"
                  srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x"
                />
              </SlackAuthLink>
            </div>}

          <div className={styles.section}>
            <h2 className={styles.sectionHeader}>API access</h2>
            <p>
              Create API tokens to hack on your Atlas.
              Learn more in <a href>API documentation</a>.
            </p>

            {this.store.apiKeys &&
              <table className={styles.apiKeyTable}>
                {this.store.apiKeys.map(key => (
                  <ApiKeyRow
                    id={key.id}
                    name={key.name}
                    secret={key.secret}
                    onDelete={this.store.deleteApiKey}
                  />
                ))}
              </table>}

            <div>
              <InlineForm
                placeholder="Token name"
                buttonLabel="Create token"
                label="InlineForm"
                name="inline_form"
                value={this.store.keyName}
                onChange={this.store.setKeyName}
                onClick={this.onKeyCreate}
                style={{ width: '100%' }}
                disabled={this.store.isFetching}
              />
            </div>

          </div>
        </CenteredContent>
      </Layout>
    );
  }
}

export default Settings;
