import { observer } from "mobx-react";
import { ProfileIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import { languageOptions } from "@shared/i18n";
import UserDelete from "~/scenes/UserDelete";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import InputSelect from "~/components/InputSelect";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import ImageInput from "./components/ImageInput";

const Profile = () => {
  const { auth } = useStores();
  const user = useCurrentUser();
  const form = React.useRef<HTMLFormElement>(null);
  const [name, setName] = React.useState<string>(user.name || "");
  const [avatarUrl, setAvatarUrl] = React.useState<string>(user.avatarUrl);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [language, setLanguage] = React.useState(user.language);
  const { showToast } = useToasts();
  const { t } = useTranslation();

  const handleSubmit = async (ev: React.SyntheticEvent) => {
    ev.preventDefault();

    try {
      await auth.updateUser({
        name,
        avatarUrl,
        language,
      });
      showToast(t("Profile saved"), {
        type: "success",
      });
    } catch (err) {
      showToast(err.message, {
        type: "error",
      });
    }
  };

  const handleNameChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleAvatarError = (error: string | null | undefined) => {
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
  const { isSaving } = auth;

  return (
    <Scene title={t("Profile")} icon={<ProfileIcon color="currentColor" />}>
      <Heading>{t("Profile")}</Heading>

      <ImageInput
        label={t("Photo")}
        onSuccess={handleAvatarUpload}
        onError={handleAvatarError}
        src={avatarUrl}
      />

      <form onSubmit={handleSubmit} ref={form}>
        <Input
          label={t("Full name")}
          autoComplete="name"
          value={name}
          onChange={handleNameChange}
          required
          short
        />
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
        <Text type="secondary" size="small">
          <Trans>
            You may delete your account at any time, note that this is
            unrecoverable
          </Trans>
        </Text>
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

export default observer(Profile);
