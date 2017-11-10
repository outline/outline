// @flow
import React from 'react';
import { observer } from 'mobx-react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import ApiKeyRow from './components/ApiKeyRow';
import SettingsStore from './SettingsStore';
import { color } from 'shared/styles/constants';

import Flex from 'shared/components/Flex';
import Button from 'components/Button';
import Input from 'components/Input';
import HelpText from 'components/HelpText';
import { Label } from 'components/Labeled';
import SlackAuthLink from 'components/SlackAuthLink';

@observer
class Settings extends React.Component {
  store: SettingsStore;

  constructor() {
    super();
    this.store = new SettingsStore();
  }

  render() {
    const showSlackSettings = DEPLOYMENT === 'hosted';

    return (
      <Flex column>
        {showSlackSettings && (
          <Section>
            <SectionLabel>Slack</SectionLabel>
            <HelpText>
              Connect Outline to your Slack to instantly search for your
              documents using <Code>/outline</Code> command.
            </HelpText>

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
          </Section>
        )}

        <Section>
          <SectionLabel>API Access</SectionLabel>
          <HelpText>
            Create API tokens to hack on your Outline. Learn more in{' '}
            <Link to="/developers">API documentation</Link>.
          </HelpText>

          {this.store.apiKeys && (
            <Table>
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
            </Table>
          )}
          <InlineForm
            placeholder="Token name"
            buttonLabel="Create token"
            name="inline_form"
            value={this.store.keyName}
            onChange={this.store.setKeyName}
            onSubmit={this.store.createApiKey}
            disabled={this.store.isFetching}
          />
        </Section>
      </Flex>
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
          <ApiKeyInput
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

const Section = styled.div`
  margin-bottom: 40px;
`;

const Table = styled.table`
  margin-bottom: 20px;
  width: 100%;

  td {
    margin-right: 20px;
    color: ${color.slate};
  }
`;

const SectionLabel = styled(Label)`
  padding-bottom: 12px;
  margin-bottom: 20px;
  border-bottom: 1px solid #eaebea;
`;

const Code = styled.code`
  padding: 4px 6px;
  margin: 0 2px;
  background: #eaebea;
  border-radius: 4px;
`;

const ApiKeyInput = styled(Input)`
  width: 100%;
  margin-right: 12px;
`;

export default Settings;
