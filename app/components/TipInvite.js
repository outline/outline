// @flow
import * as React from 'react';
import styled from 'styled-components';
import Tip from './Tip';
import CopyToClipboard from './CopyToClipboard';
import Team from '../models/Team';

type Props = {
  team: Team,
};

type State = {
  linkCopied: boolean,
};

class TipInvite extends React.Component<Props, State> {
  state = {
    linkCopied: false,
  };

  handleCopy = () => {
    this.setState({ linkCopied: true });
  };

  render() {
    const { team } = this.props;

    return (
      <Tip id="subdomain-invite">
        <Heading>Looking to invite your team?</Heading>
        <Paragraph>
          Your teammates can sign in with{' '}
          {team.slackConnected ? 'Slack' : 'Google'} to join this knowledgebase
          at your team’s own subdomain ({team.url.replace(/^https?:\/\//, '')})
          –{' '}
          <CopyToClipboard text={team.url} onCopy={this.handleCopy}>
            <a>
              {this.state.linkCopied
                ? 'link copied to clipboard!'
                : 'copy a link to share.'}
            </a>
          </CopyToClipboard>
        </Paragraph>
      </Tip>
    );
  }
}

const Heading = styled.h3`
  margin: 0.25em 0 0.5em 0;
`;

const Paragraph = styled.p`
  margin: 0.25em 0;

  a {
    color: ${props => props.theme.text};
    text-decoration: underline;
  }
`;

export default TipInvite;
