// @flow
import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import ApiToken from './components/ApiToken';
import SettingsStore from 'stores/SettingsStore';
import { color } from 'shared/styles/constants';

import Button from 'components/Button';
import Input from 'components/Input';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';
import Subheading from 'components/Subheading';

@observer
class Settings extends Component {
  @observable name: string = '';
  props: {
    settings: SettingsStore,
  };

  componentDidMount() {
    this.props.settings.fetchApiKeys();
  }

  handleUpdate = (ev: SyntheticInputEvent) => {
    this.name = ev.target.value;
  };

  handleSubmit = async (ev: SyntheticEvent) => {
    ev.preventDefault();
    await this.props.settings.createApiKey(this.name);
    this.name = '';
  };

  render() {
    const { settings } = this.props;
    const hasApiKeys = settings.apiKeys.length > 0;

    return (
      <CenteredContent>
        <PageTitle title="API Tokens" />
        <h1>API Tokens</h1>

        {hasApiKeys && [
          <Subheading>Your tokens</Subheading>,
          <Table>
            <tbody>
              {settings.apiKeys.map(key => (
                <ApiToken
                  id={key.id}
                  key={key.id}
                  name={key.name}
                  secret={key.secret}
                  onDelete={settings.deleteApiKey}
                />
              ))}
            </tbody>
          </Table>,
          <Subheading>Create a token</Subheading>,
        ]}

        <HelpText>
          You can create unlimited personal API tokens to hack on your wiki.
          Learn more in the <Link to="/developers">API documentation</Link>.
        </HelpText>

        <form onSubmit={this.handleSubmit}>
          <Input
            onChange={this.handleUpdate}
            placeholder="Token label (eg. development)"
            value={this.name}
            required
          />
          <Button
            type="submit"
            value="Create Token"
            disabled={settings.isSaving}
          />
        </form>
      </CenteredContent>
    );
  }
}

const Table = styled.table`
  margin-bottom: 30px;
  width: 100%;

  td {
    margin-right: 20px;
    color: ${color.slate};
  }
`;

export default inject('settings')(Settings);
