// @flow
import { observer } from "mobx-react";
import { ProfileIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import { languageOptions } from "shared/i18n";
import UserDelete from "scenes/UserDelete";
import Button from "components/Button";
import Flex from "components/Flex";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import Input, { LabelText } from "components/Input";
import InputSelect from "components/InputSelect";
import Scene from "components/Scene";
import ImageUpload from "./components/ImageUpload";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";

const Profile = () => {
  const { auth } = useStores();
  const form = React.useRef<?HTMLFormElement>();
  const [name, setName] = React.useState<string>(auth.user?.name || "");
  const [avatarUrl, setAvatarUrl] = React.useState<?string>();
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [language, setLanguage] = React.useState(auth.user?.language);

  const { showToast } = useToasts();
  const { t } = useTranslation();

  const handleSubmit = async (ev: SyntheticEvent<>) => {
    ev.preventDefault();

    await auth.updateUser({
      name,
      avatarUrl,
      language,
    });

    showToast(t("Profile saved"), { type: "success" });
  };

  const handleNameChange = (ev: SyntheticInputEvent<*>) => {
    setName(ev.target.value);
  };

  const handleAvatarUpload = async (avatarUrl: string) => {
    setAvatarUrl(avatarUrl);

    await auth.updateUser({
      avatarUrl,
    });
    showToast(t("Profile picture updated"), {
      type: "success",
    });
  };

  const handleAvatarError = (error: ?string) => {
    showToast(error || t("Unable to upload new profile picture"), {
      type: "error",
    });
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
  };

  const toggleDeleteAccount = () => {
    setShowDeleteModal((prev) => !prev);
  };

  const isValid = form.current && form.current.checkValidity();

  const { user, isSaving } = auth;
  if (!user) return null;

  return (
    <Scene title={t("Profile")} icon={<ProfileIcon color="currentColor" />}>
      <Heading>{t("Profile")}</Heading>
      <ProfilePicture column>
        <LabelText>{t("Photo")}</LabelText>
        <AvatarContainer>
          <ImageUpload
            onSuccess={handleAvatarUpload}
            onError={handleAvatarError}
          >
            <Avatar src={avatarUrl || user?.avatarUrl} />
            <Flex auto align="center" justify="center">
              {t("Upload")}
            </Flex>
          </ImageUpload>
        </AvatarContainer>
      </ProfilePicture>
      <form onSubmit={handleSubmit} ref={form}>
        <Input
          label={t("Full name")}
          autoComplete="name"
          value={name}
          onChange={handleNameChange}
          required
          short
        />
        <br />
        <InputSelect
          label={t("Language")}
          options={languageOptions}
          value={language}
          onChange={handleLanguageChange}
          ariaLabel={t("Language")}
          note={
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
          }
          short
        />
        <Button type="submit" disabled={isSaving || !isValid}>
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
        <Button onClick={toggleDeleteAccount} neutral>
          {t("Delete account")}…
        </Button>
      </DangerZone>
      {showDeleteModal && <UserDelete onRequestClose={toggleDeleteAccount} />}
    </Scene>
  );
};

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

export default observer(Profile);
