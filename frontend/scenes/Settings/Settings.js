// @flow
import React from 'react';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import { Flex } from 'reflexbox';

import ApiKeyRow from './components/ApiKeyRow';
import styles from './Settings.scss';
import SettingsStore from './SettingsStore';

import Layout, { Title } from 'components/Layout';
import CenteredContent from 'components/CenteredContent';
import SlackAuthLink from 'components/SlackAuthLink';
import PageTitle from 'components/PageTitle';

@observer class Settings extends React.Component {
  store: SettingsStore;

  constructor() {
    super();
    this.store = new SettingsStore();
  }

  render() {
    const title = <Title content="Settings" />;
    const showSlackSettings = DEPLOYMENT === 'hosted';

    return (
      <Layout title={title} search={false} loading={this.store.isFetching}>
        <PageTitle title="Settings" />
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
                redirectUri={`${BASE_URL}/auth/slack/commands`}
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
                <tbody>
                  {this.store.apiKeys &&
                    this.store.apiKeys.map(key => (
                      <ApiKeyRow
                        id={key.id}
                        key={key.id}
                        name={key.name}
                        secret={key.secret}
                        onDelete={this.store.deleteApiKey}
                      />
                    ))}
                </tbody>
              </table>}

            <div>
              <InlineForm
                placeholder="Token name"
                buttonLabel="Create token"
                name="inline_form"
                value={this.store.keyName}
                onChange={this.store.setKeyName}
                onSubmit={this.store.createApiKey}
                disabled={this.store.isFetching}
              />
            </div>
          </div>
        </CenteredContent>
      </Layout>
    );
  }
}

class InlineForm extends React.Component {
  props: {
    placeholder: string,
    buttonLabel: string,
    name: string,
    value: ?string,
    onChange: Function,
    onSubmit: Function,
    disabled?: ?boolean,
  };
  validationTimeout: number;

  state = {
    validationError: false,
  };

  componentWillUnmount() {
    clearTimeout(this.validationTimeout);
  }

  handleSubmit = event => {
    event.preventDefault();
    if (this.props.value) {
      this.props.onSubmit();
    } else {
      this.setState({
        validationError: true,
      });
      this.validationTimeout = setTimeout(
        () =>
          this.setState({
            validationError: false,
          }),
        2500
      );
    }
  };

  render() {
    const { placeholder, value, onChange, buttonLabel } = this.props;
    const { validationError } = this.state;

    return (
      <form onSubmit={this.handleSubmit}>
        <Flex auto>
          <TextInput
            type="text"
            placeholder={validationError ? 'Please add a label' : placeholder}
            value={value || ''}
            onChange={onChange}
            validationError={validationError}
          />
          <Button type="submit" value={buttonLabel} />
        </Flex>
      </form>
    );
  }
}

const TextInput = styled.input`
  display:flex;
  flex: 1;
  height:32px;
  margin:0;
  padding-left:8px;
  padding-right:8px;
  color:inherit;
  background-color: rgba(255, 255, 255, .25);
  border-width:1px;
  border-style:solid;
  border-color: ${props => (props.validationError ? 'red' : 'rgba(0, 0, 0, .25)')};
  border-radius:2px 0 0 2px;
`;

const Button = styled.input`
  box-shadow:inset 0 0 0 1px;
  font-family:inherit;
  font-size:14px;
  line-height:16px;
  min-height:32px;
  text-decoration:none;
  display:inline-block;
  margin:0;
  padding-top:8px;
  padding-bottom:8px;
  padding-left:16px;
  padding-right:16px;
  cursor:pointer;
  border:0;
  color:black;
  background-color:transparent;
  border-radius:0 2px 2px 0;
  margin-left:-1px;
`;

export default Settings;
