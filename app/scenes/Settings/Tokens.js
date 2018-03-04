// @flow
import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import ApiToken from './components/ApiToken';
import ApiKeysStore from 'stores/settings/ApiKeysStore';
import { color } from 'shared/styles/constants';

import Button from 'components/Button';
import Input from 'components/Input';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';
import Subheading from 'components/Subheading';

@observer
class Tokens extends Component {
  @observable name: string = '';
  props: {
    apiKeys: ApiKeysStore,
  };

  componentDidMount() {
    this.props.apiKeys.fetchApiKeys();
  }

  handleUpdate = (ev: SyntheticInputEvent) => {
    this.name = ev.target.value;
  };

  handleSubmit = async (ev: SyntheticEvent) => {
    ev.preventDefault();
    await this.props.apiKeys.createApiKey(this.name);
    this.name = '';
  };

  render() {
    const { apiKeys } = this.props;
    const hasApiKeys = apiKeys.apiKeys.length > 0;

    return (
      <CenteredContent>
        <PageTitle title="API Tokens" />
        <h1>API Tokens</h1>

        {hasApiKeys && [
          <Subheading>Your tokens</Subheading>,
          <Table>
            <tbody>
              {apiKeys.apiKeys.map(key => (
                <ApiToken
                  id={key.id}
                  key={key.id}
                  name={key.name}
                  secret={key.secret}
                  onDelete={apiKeys.deleteApiKey}
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
            disabled={apiKeys.isSaving}
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

export default inject('apiKeys')(Tokens);
