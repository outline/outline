// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import styled from 'styled-components';

import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import HelpText from 'components/HelpText';
import SlackAuthLink from 'components/SlackAuthLink';

@observer
class Slack extends Component {
  render() {
    return (
      <CenteredContent>
        <PageTitle title="Slack" />
        <h1>Slack</h1>
        <HelpText>
          Connect Outline to your Slack team to instantly search for documents
          using the <Code>/outline</Code> command.
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
