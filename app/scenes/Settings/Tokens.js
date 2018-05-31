// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Link } from 'react-router-dom';
import ApiKeysStore from 'stores/ApiKeysStore';

import Button from 'components/Button';
import Input from 'components/Input';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';
import List from 'components/List';
import TokenListItem from './components/TokenListItem';

type Props = {
  apiKeys: ApiKeysStore,
};

@observer
class Tokens extends React.Component<Props> {
  @observable name: string = '';

  componentDidMount() {
    this.props.apiKeys.fetchPage({ limit: 100 });
  }

  handleUpdate = (ev: SyntheticInputEvent<*>) => {
    this.name = ev.target.value;
  };

  handleSubmit = async (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    await this.props.apiKeys.createApiKey(this.name);
    this.name = '';
  };

  render() {
    const { apiKeys } = this.props;
    const hasApiKeys = apiKeys.data.length > 0;

    return (
      <CenteredContent>
        <PageTitle title="API Tokens" />
        <h1>API Tokens</h1>

        <HelpText>
          You can create an unlimited amount of personal API tokens to hack on
          Outline. For more details about the API take a look at the{' '}
          <Link to="/developers">developer documentation</Link>.
        </HelpText>

        {hasApiKeys && (
          <List>
            {apiKeys.data.map(token => (
              <TokenListItem
                key={token.id}
                token={token}
                onDelete={apiKeys.deleteApiKey}
              />
            ))}
          </List>
        )}

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

export default inject('apiKeys')(Tokens);
