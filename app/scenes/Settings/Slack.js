// @flow
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import styled from 'styled-components';

import Button from 'components/Button';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';
import SlackButton from './components/SlackButton';
import CollectionsStore from 'stores/CollectionsStore';
import IntegrationsStore from 'stores/IntegrationsStore';

type Props = {
  collections: CollectionsStore,
  integrations: IntegrationsStore,
};

@observer
class Slack extends Component {
  props: Props;

  componentDidMount() {
    this.props.integrations.fetchPage();
  }

  render() {
    const { collections, integrations } = this.props;

    return (
      <CenteredContent>
        <PageTitle title="Slack" />
        <h1>Slack</h1>
        <HelpText>
          Connect Outline to your Slack team to instantly search for documents
          using the <Code>/outline</Code> command and preview Outline links.
        </HelpText>

        <SlackButton
          scopes={['commands', 'links:read', 'links:write']}
          redirectUri={`${BASE_URL}/auth/slack/commands`}
        />

        <h2>Existing</h2>
        <ol>
          {integrations.orderedData.map(integration => (
            <li>
              {integration.serviceId} posting to {integration.settings.channel}
              <Button onClick={integration.delete}>Remove</Button>
            </li>
          ))}
        </ol>

        <h2>Add new</h2>
        <ol>
          {collections.orderedData.map(collection => (
            <li>
              {collection.name}
              <SlackButton
                scopes={['incoming-webhook']}
                redirectUri={`${BASE_URL}/auth/slack/post`}
                state={collection.id}
              />
            </li>
          ))}
        </ol>
      </CenteredContent>
    );
  }
}

const Code = styled.code`
  padding: 4px 6px;
  margin: 0 2px;
  background: #eaebea;
  border-radius: 4px;
`;

export default inject('collections', 'integrations')(Slack);
