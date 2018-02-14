// @flow
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import styled from 'styled-components';

import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';
import SlackButton from './components/SlackButton';
import CollectionsStore from 'stores/CollectionsStore';

type Props = {
  collections: CollectionsStore,
};

@observer
class Slack extends Component {
  props: Props;

  render() {
    const { collections } = this.props;

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

export default inject('collections')(Slack);
