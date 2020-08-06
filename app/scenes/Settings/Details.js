// @flow
import * as React from "react";
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import styled from "styled-components";

import AuthStore from "stores/AuthStore";
import UiStore from "stores/UiStore";
import ImageUpload from "./components/ImageUpload";
import Input, { LabelText } from "components/Input";
import Button from "components/Button";
import CenteredContent from "components/CenteredContent";
import PageTitle from "components/PageTitle";
import HelpText from "components/HelpText";
import Flex from "components/Flex";
import env from "env";

type Props = {
  auth: AuthStore,
  ui: UiStore,
};

@observer
class Details extends React.Component<Props> {
  timeout: TimeoutID;
  form: ?HTMLFormElement;

  @observable name: string;
  @observable subdomain: ?string;
  @observable avatarUrl: ?string;

  componentDidMount() {
    const { team } = this.props.auth;
    if (team) {
      this.name = team.name;
      this.subdomain = team.subdomain;
    }
  }

  componentWillUnmount() {
    clearTimeout(this.timeout);
  }

  handleSubmit = async (ev: SyntheticEvent<>) => {
    ev.preventDefault();

    try {
      await this.props.auth.updateTeam({
        name: this.name,
        avatarUrl: this.avatarUrl,
        subdomain: this.subdomain,
      });
      this.props.ui.showToast("Settings saved");
    } catch (err) {
      this.props.ui.showToast(err.message);
    }
  };

  handleNameChange = (ev: SyntheticInputEvent<*>) => {
    this.name = ev.target.value;
  };

  handleSubdomainChange = (ev: SyntheticInputEvent<*>) => {
    this.subdomain = ev.target.value.toLowerCase();
  };

  handleAvatarUpload = (avatarUrl: string) => {
    this.avatarUrl = avatarUrl;
  };

  handleAvatarError = (error: ?string) => {
    this.props.ui.showToast(error || "Unable to upload new logo");
  };

  get isValid() {
    return this.form && this.form.checkValidity();
  }

  render() {
    const { team, isSaving } = this.props.auth;
    if (!team) return null;
    const avatarUrl = this.avatarUrl || team.avatarUrl;

    return (
      <CenteredContent>
        <PageTitle title="Details" />
        <h1>Details</h1>
        <HelpText>
          These details affect the way that your Outline appears to everyone on
          the team.
        </HelpText>

        <ProfilePicture column>
          <LabelText>Logo</LabelText>
          <AvatarContainer>
            <ImageUpload
              onSuccess={this.handleAvatarUpload}
              onError={this.handleAvatarError}
              submitText="Crop logo"
              borderRadius={0}
            >
              <Avatar src={avatarUrl} />
              <Flex auto align="center" justify="center">
                Upload
              </Flex>
            </ImageUpload>
          </AvatarContainer>
        </ProfilePicture>
        <form onSubmit={this.handleSubmit} ref={ref => (this.form = ref)}>
          <Input
            label="Name"
            name="name"
            autoComplete="organization"
            value={this.name}
            onChange={this.handleNameChange}
            required
            short
          />
          {env.SUBDOMAINS_ENABLED && (
            <React.Fragment>
              <Input
                label="Subdomain"
                name="subdomain"
                value={this.subdomain || ""}
                onChange={this.handleSubdomainChange}
                autoComplete="off"
                minLength={4}
                maxLength={32}
                short
              />
              {this.subdomain && (
                <HelpText small>
                  Your knowledge base will be accessible at{" "}
                  <strong>{this.subdomain}.getoutline.com</strong>
                </HelpText>
              )}
            </React.Fragment>
          )}
          <Button type="submit" disabled={isSaving || !this.isValid}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </form>
      </CenteredContent>
    );
  }
}

const ProfilePicture = styled(Flex)`
  margin-bottom: 24px;
`;

const avatarStyles = `
  width: 80px;
  height: 80px;
  border-radius: 8px;
`;

const AvatarContainer = styled(Flex)`
  ${avatarStyles};
  position: relative;
  box-shadow: 0 0 0 1px #dae1e9;
  background: ${props => props.theme.white};

  div div {
    ${avatarStyles};
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    opacity: 0;
    cursor: pointer;
    transition: all 250ms;
  }

  &:hover div {
    opacity: 1;
    background: rgba(0, 0, 0, 0.75);
    color: ${props => props.theme.white};
  }
`;

const Avatar = styled.img`
  ${avatarStyles};
`;

export default inject("auth", "ui")(Details);
