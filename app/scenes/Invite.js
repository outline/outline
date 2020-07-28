// @flow
import * as React from "react";
import { Link, withRouter, type RouterHistory } from "react-router-dom";
import { observable, action } from "mobx";
import { inject, observer } from "mobx-react";
import { CloseIcon } from "outline-icons";
import styled from "styled-components";
import Flex from "shared/components/Flex";
import Button from "components/Button";
import Input from "components/Input";
import CopyToClipboard from "components/CopyToClipboard";
import Checkbox from "components/Checkbox";
import HelpText from "components/HelpText";
import Tooltip from "components/Tooltip";
import NudeButton from "components/NudeButton";

import UiStore from "stores/UiStore";
import AuthStore from "stores/AuthStore";
import UsersStore from "stores/UsersStore";
import PoliciesStore from "stores/PoliciesStore";

const MAX_INVITES = 20;

type Props = {
  auth: AuthStore,
  users: UsersStore,
  history: RouterHistory,
  policies: PoliciesStore,
  ui: UiStore,
  onSubmit: () => void,
};

type InviteRequest = {
  email: string,
  name: string,
  guest: boolean,
};

@observer
class Invite extends React.Component<Props> {
  @observable isSaving: boolean;
  @observable linkCopied: boolean = false;
  @observable
  invites: InviteRequest[] = [
    { email: "", name: "", guest: false },
    { email: "", name: "", guest: false },
    { email: "", name: "", guest: false },
  ];

  handleSubmit = async (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.isSaving = true;

    try {
      await this.props.users.invite(this.invites);
      this.props.onSubmit();
      this.props.ui.showToast("We sent out your invites!");
    } catch (err) {
      this.props.ui.showToast(err.message);
    } finally {
      this.isSaving = false;
    }
  };

  @action
  handleChange = (ev, index) => {
    this.invites[index][ev.target.name] = ev.target.value;
  };

  @action
  handleGuestChange = (ev, index) => {
    this.invites[index][ev.target.name] = ev.target.checked;
  };

  @action
  handleAdd = () => {
    if (this.invites.length >= MAX_INVITES) {
      this.props.ui.showToast(
        `Sorry, you can only send ${MAX_INVITES} invites at a time`
      );
    }

    this.invites.push({ email: "", name: "", guest: false });
  };

  @action
  handleRemove = (ev: SyntheticEvent<>, index: number) => {
    ev.preventDefault();
    this.invites.splice(index, 1);
  };

  handleCopy = () => {
    this.linkCopied = true;
    this.props.ui.showToast("A link was copied to your clipboard");
  };

  render() {
    const { team, user } = this.props.auth;
    if (!team || !user) return null;

    const predictedDomain = user.email.split("@")[1];
    const can = this.props.policies.abilities(team.id);

    return (
      <form onSubmit={this.handleSubmit}>
        {team.guestSignin ? (
          <HelpText>
            Invite team members or guests to join your knowledge base. Team
            members can sign in with {team.signinMethods} and guests can use
            their email address.
          </HelpText>
        ) : (
          <HelpText>
            Invite team members to join your knowledge base. They will need to
            sign in with {team.signinMethods}.{" "}
            {can.update && (
              <React.Fragment>
                As an admin you can also{" "}
                <Link to="/settings/security">enable guest invites</Link>.
              </React.Fragment>
            )}
          </HelpText>
        )}
        {team.subdomain && (
          <CopyBlock>
            Want a link to share directly with your team?
            <Flex>
              <Input type="text" value={team.url} readOnly flex />&nbsp;&nbsp;
              <CopyToClipboard text={team.url} onCopy={this.handleCopy}>
                <Button type="button" neutral>
                  {this.linkCopied ? "Link copied" : "Copy link"}
                </Button>
              </CopyToClipboard>
            </Flex>
          </CopyBlock>
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
              required={index === 0}
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
            {team.guestSignin && (
              <React.Fragment>
                &nbsp;&nbsp;
                <Tooltip
                  tooltip={
                    <span>
                      Guests can sign in with email and <br />do not require{" "}
                      {team.signinMethods} accounts
                    </span>
                  }
                  placement="top"
                >
                  <Guest>
                    <Checkbox
                      name="guest"
                      label="Guest"
                      onChange={ev => this.handleGuestChange(ev, index)}
                      checked={invite.guest}
                    />
                  </Guest>
                </Tooltip>
              </React.Fragment>
            )}
            {index !== 0 && (
              <Remove>
                <Tooltip tooltip="Remove invite" placement="top">
                  <NudeButton onClick={ev => this.handleRemove(ev, index)}>
                    <CloseIcon />
                  </NudeButton>
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
            {this.isSaving ? "Inviting…" : "Send Invites"}
          </Button>
        </Flex>
        <br />
      </form>
    );
  }
}

const CopyBlock = styled("div")`
  font-size: 14px;
  background: ${props => props.theme.secondaryBackground};
  padding: 8px 16px 4px;
  border-radius: 8px;
  margin-bottom: 24px;

  input {
    background: ${props => props.theme.background};
    border-radius: 4px;
  }
`;

const Guest = styled("div")`
  padding-top: 4px;
  margin: 0 4px 16px;
  align-self: flex-end;
`;

const Remove = styled("div")`
  margin-top: 6px;
  position: absolute;
  right: -32px;
`;

export default inject("auth", "users", "policies", "ui")(withRouter(Invite));
