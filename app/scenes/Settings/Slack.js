// @flow
import * as React from 'react';
import { inject, observer } from 'mobx-react';
import _ from 'lodash';
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
class Slack extends React.Component<Props> {
  componentDidMount() {
    this.props.integrations.fetchPage();
  }

  get commandIntegration() {
    return _.find(this.props.integrations.slackIntegrations, {
      type: 'command',
    });
  }

  render() {
    const { collections, integrations } = this.props;

    return (
      <CenteredContent>
        <PageTitle title="Slack" />
        <h1>Slack</h1>
        <HelpText>
          Preview Outline links your team mates share and use the{' '}
          <Code>/outline</Code> slash command in Slack to search for documents
          in your teams wiki.
        </HelpText>
        <p>
          {this.commandIntegration ? (
            <Button onClick={this.commandIntegration.delete}>Disconnect</Button>
          ) : (
            <SlackButton
              scopes={['commands', 'links:read', 'links:write']}
              redirectUri={`${BASE_URL}/auth/slack.commands`}
            />
          )}
        </p>
        <p>&nbsp;</p>

        <h2>Collections</h2>
        <HelpText>
          Connect Outline collections to Slack channels and messages will be
          posted in Slack when documents are published or updated.
        </HelpText>

        <List>
          {collections.orderedData.map(collection => {
            const integration = _.find(integrations.slackIntegrations, {
              collectionId: collection.id,
            });

            if (integration) {
              return (
                <ListItem key={integration.id}>
                  <span>
                    <strong>{collection.name}</strong> posting activity to the{' '}
                    <strong>{integration.settings.channel}</strong> Slack
                    channel
                  </span>
                  <Button onClick={integration.delete}>Disconnect</Button>
                </ListItem>
              );
            }

            return (
              <ListItem key={collection.id}>
                <strong>{collection.name}</strong>
                <SlackButton
                  scopes={['incoming-webhook']}
                  redirectUri={`${BASE_URL}/auth/slack.post`}
                  state={collection.id}
                  label="Connect"
                />
              </ListItem>
            );
          })}
        </List>
      </CenteredContent>
    );
  }
}

const List = styled.ol`
  list-style: none;
  margin: 8px 0;
  padding: 0;
`;

const ListItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #eaebea;
`;

const Code = styled.code`
  padding: 4px 6px;
  margin: 0 2px;
  background: #eaebea;
  border-radius: 4px;
`;

export default inject('collections', 'integrations')(Slack);
