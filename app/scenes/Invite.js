// @flow
import * as React from 'react';
import { withRouter } from 'react-router-dom';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import { CloseIcon } from 'outline-icons';
import styled from 'styled-components';
import Flex from 'shared/components/Flex';
import CopyToClipboard from 'components/CopyToClipboard';
import Button from 'components/Button';
import Input from 'components/Input';
import HelpText from 'components/HelpText';
import Tooltip from 'components/Tooltip';

import UiStore from 'stores/UiStore';
import AuthStore from 'stores/AuthStore';
import UsersStore from 'stores/UsersStore';

const MAX_INVITES = 20;

type Props = {
  auth: AuthStore,
  users: UsersStore,
  history: Object,
  ui: UiStore,
  onSubmit: () => void,
};

@observer
class Invite extends React.Component<Props> {
  @observable isSaving: boolean;
  @observable linkCopied: boolean = false;
  @observable
  invites: { email: string, name: string }[] = [
    { email: '', name: '' },
    { email: '', name: '' },
    { email: '', name: '' },
  ];

  handleSubmit = async (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    this.isSaving = true;

    try {
      await this.props.users.invite(this.invites);
      this.props.onSubmit();
      this.props.ui.showToast('We sent out your invites!');
    } catch (err) {
      this.props.ui.showToast(err.message);
    } finally {
      this.isSaving = false;
    }
  };

  handleChange = (ev, index) => {
    this.invites[index][ev.target.name] = ev.target.value;
  };

  handleAdd = () => {
    if (this.invites.length >= MAX_INVITES) {
      this.props.ui.showToast(
        `Sorry, you can only send ${MAX_INVITES} invites at a time`
      );
    }

    this.invites.push({ email: '', name: '' });
  };

  handleRemove = (index: number) => {
    this.invites.splice(index, 1);
  };

  handleCopy = () => {
    this.linkCopied = true;
  };

  render() {
    const { team, user } = this.props.auth;
    if (!team || !user) return null;

    const predictedDomain = user.email.split('@')[1];

    return (
      <form onSubmit={this.handleSubmit}>
        <HelpText>
          Send invites to your team members to get them kick started. Currently,
          they must be able to sign in with your team{' '}
          {team.slackConnected ? 'Slack' : 'Google'} account to be able to join
          Outline.
        </HelpText>
        {team.subdomain && (
          <HelpText>
            You can also{' '}
            <CopyToClipboard text={team.url} onCopy={this.handleCopy}>
              <a>{this.linkCopied ? 'link copied' : 'copy a link'}</a>
            </CopyToClipboard>{' '}
            to your teams signin page.
          </HelpText>
        )}
        {this.invites.map((invite, index) => (
          <Flex key={index}>
            <Input
              type="email"
              name="email"
              label="Email"
              labelHidden={index !== 0}
              onChange={ev => this.handleChange(ev, index)}
              placeholder={`example@${predictedDomain}`}
              value={invite.email}
              autoFocus={index === 0}
              flex
            />
            &nbsp;&nbsp;
            <Input
              type="text"
              name="name"
              label="Full name"
              labelHidden={index !== 0}
              onChange={ev => this.handleChange(ev, index)}
              value={invite.name}
              required={!!invite.email}
              flex
            />
            {index !== 0 && (
              <Remove>
                <Tooltip tooltip="Remove invite" placement="top">
                  <CloseIcon onClick={() => this.handleRemove(index)} />
                </Tooltip>
              </Remove>
            )}
          </Flex>
        ))}

        <Flex justify="space-between">
          {this.invites.length <= MAX_INVITES ? (
            <Button type="button" onClick={this.handleAdd} neutral>
              Add another…
            </Button>
          ) : (
            <span />
          )}

          <Button
            type="submit"
            disabled={this.isSaving}
            data-on="click"
            data-event-category="invite"
            data-event-action="sendInvites"
          >
            {this.isSaving ? 'Inviting…' : 'Send Invites'}
          </Button>
        </Flex>
        <br />
      </form>
    );
  }
}

const Remove = styled('div')`
  margin-top: 6px;
  position: absolute;
  right: -32px;
`;

export default inject('auth', 'users', 'ui')(withRouter(Invite));
