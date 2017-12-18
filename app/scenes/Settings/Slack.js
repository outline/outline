// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import styled from 'styled-components';

import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';
import SlackButton from './components/SlackButton';

@observer
class Slack extends Component {
  render() {
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

export default Slack;
