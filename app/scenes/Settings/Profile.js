// @flow
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import { ProfileIcon } from "outline-icons";
import * as React from "react";
import { Trans, withTranslation, type TFunction } from "react-i18next";
import styled from "styled-components";
import { languageOptions } from "shared/i18n";
import AuthStore from "stores/AuthStore";
import UiStore from "stores/UiStore";
import UserDelete from "scenes/UserDelete";
import Button from "components/Button";
import Flex from "components/Flex";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import Input, { LabelText } from "components/Input";
import InputSelect from "components/InputSelect";
import Scene from "components/Scene";
import ImageUpload from "./components/ImageUpload";

type Props = {
  auth: AuthStore,
  ui: UiStore,
  t: TFunction,
};

@observer
class Profile extends React.Component<Props> {
  timeout: TimeoutID;
  form: ?HTMLFormElement;

  @observable name: string;
  @observable avatarUrl: ?string;
  @observable showDeleteModal: boolean = false;
  @observable language: string;

  componentDidMount() {
    if (this.props.auth.user) {
      this.name = this.props.auth.user.name;
      this.language = this.props.auth.user.language;
    }
  }

  componentWillUnmount() {
    clearTimeout(this.timeout);
  }

  handleSubmit = async (ev: SyntheticEvent<>) => {
    const { t } = this.props;
    ev.preventDefault();

    await this.props.auth.updateUser({
      name: this.name,
      avatarUrl: this.avatarUrl,
      language: this.language,
    });

    this.props.ui.showToast(t("Profile saved"), { type: "success" });
  };

  handleNameChange = (ev: SyntheticInputEvent<*>) => {
    this.name = ev.target.value;
  };

  handleAvatarUpload = async (avatarUrl: string) => {
    const { t } = this.props;
    this.avatarUrl = avatarUrl;

    await this.props.auth.updateUser({
      avatarUrl: this.avatarUrl,
    });
    this.props.ui.showToast(t("Profile picture updated"), { type: "success" });
  };

  handleAvatarError = (error: ?string) => {
    const { t } = this.props;
    this.props.ui.showToast(
      error || t("Unable to upload new profile picture"),
      { type: "error" }
    );
  };

  handleLanguageChange = (ev: SyntheticInputEvent<*>) => {
    this.language = ev.target.value;
  };

  toggleDeleteAccount = () => {
    this.showDeleteModal = !this.showDeleteModal;
  };

  get isValid() {
    return this.form && this.form.checkValidity();
  }

  render() {
    const { t } = this.props;
    const { user, isSaving } = this.props.auth;
    if (!user) return null;
    const avatarUrl = this.avatarUrl || user.avatarUrl;

    return (
      <Scene title={t("Profile")} icon={<ProfileIcon color="currentColor" />}>
        <Heading>{t("Profile")}</Heading>
        <ProfilePicture column>
          <LabelText>{t("Photo")}</LabelText>
          <AvatarContainer>
            <ImageUpload
              onSuccess={this.handleAvatarUpload}
              onError={this.handleAvatarError}
            >
              <Avatar src={avatarUrl} />
              <Flex auto align="center" justify="center">
                {t("Upload")}
              </Flex>
            </ImageUpload>
          </AvatarContainer>
        </ProfilePicture>
        <form onSubmit={this.handleSubmit} ref={(ref) => (this.form = ref)}>
          <Input
            label={t("Full name")}
            autoComplete="name"
            value={this.name}
            onChange={this.handleNameChange}
            required
            short
          />
          <br />
          <InputSelect
            label={t("Language")}
            options={languageOptions}
            value={this.language}
            onChange={this.handleLanguageChange}
            short
          />
          <HelpText small>
            <Trans>
              Please note that translations are currently in early access.
              <br />
              Community contributions are accepted though our{" "}
              <a
                href="https://translate.getoutline.com"
                target="_blank"
                rel="noreferrer"
              >
                translation portal
              </a>
            </Trans>
            .
          </HelpText>
          <Button type="submit" disabled={isSaving || !this.isValid}>
            {isSaving ? `${t("Saving")}…` : t("Save")}
          </Button>
        </form>

        <DangerZone>
          <h2>{t("Delete Account")}</h2>
          <HelpText small>
            <Trans>
              You may delete your account at any time, note that this is
              unrecoverable
            </Trans>
          </HelpText>
          <Button onClick={this.toggleDeleteAccount} neutral>
            {t("Delete account")}…
          </Button>
        </DangerZone>
        {this.showDeleteModal && (
          <UserDelete onRequestClose={this.toggleDeleteAccount} />
        )}
      </Scene>
    );
  }
}

const DangerZone = styled.div`
  margin-top: 60px;
`;

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
    color: ${(props) => props.theme.white};
  }
`;

const Avatar = styled.img`
  ${avatarStyles};
`;

export default withTranslation()<Profile>(inject("auth", "ui")(Profile));
