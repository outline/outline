// @flow
import * as React from 'react';
import { withRouter } from 'react-router-dom';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import Flex from 'shared/components/Flex';
import Button from 'components/Button';
import Input from 'components/Input';
import HelpText from 'components/HelpText';

import UiStore from 'stores/UiStore';
import AuthStore from 'stores/AuthStore';

type Props = {
  auth: AuthStore,
  history: Object,
  ui: UiStore,
  onSubmit: () => void,
};

@observer
class Invite extends React.Component<Props> {
  @observable isSaving: boolean;
  @observable
  invites: Array<{ email: string, name: string }> = [{ email: '', name: '' }];

  handleSubmit = async (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    // this.isSaving = true;
    // const collection = new Collection(
    //   {
    //     name: this.name,
    //     description: this.description,
    //     color: this.color,
    //     private: this.private,
    //   },
    //   this.props.collections
    // );

    // try {
    //   await collection.save();
    //   this.props.onSubmit();
    //   this.props.history.push(collection.url);
    // } catch (err) {
    //   this.props.ui.showToast(err.message);
    // } finally {
    //   this.isSaving = false;
    // }
  };

  handleChange = (ev, index) => {
    this.invites[index][ev.target.name] = ev.target.value;
  };

  handleAddAnother = () => {
    this.invites.push({ email: '', name: '' });
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
        {this.invites.map((invite, index) => (
          <Flex key={index}>
            <Input
              type="email"
              name="email"
              label={index === 0 ? 'Email' : undefined}
              onChange={ev => this.handleChange(ev, index)}
              placeholder={`example@${predictedDomain}`}
              value={invite.email}
              autoFocus
              flex
            />
            &nbsp;&nbsp;
            <Input
              type="text"
              name="name"
              label={index === 0 ? 'Full name' : undefined}
              onChange={ev => this.handleChange(ev, index)}
              value={invite.name}
              required={!!invite.email}
              flex
            />
          </Flex>
        ))}

        <Flex justify="space-between">
          <Button type="button" onClick={this.handleAddAnother} neutral>
            Add another…
          </Button>

          <Button type="submit" disabled={this.isSaving}>
            {this.isSaving ? 'Inviting…' : 'Send Invites'}
          </Button>
        </Flex>
        <br />
      </form>
    );
  }
}

export default inject('auth', 'ui')(withRouter(Invite));
