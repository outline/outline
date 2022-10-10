import { observer } from "mobx-react";
import { ProfileIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import Scene from "~/components/Scene";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import ImageInput from "./components/ImageInput";
import SettingRow from "./components/SettingRow";

const Profile = () => {
  const { auth } = useStores();
  const user = useCurrentUser();
  const form = React.useRef<HTMLFormElement>(null);
  const [name, setName] = React.useState<string>(user.name || "");
  const [avatarUrl, setAvatarUrl] = React.useState<string>(user.avatarUrl);
  const { showToast } = useToasts();
  const { t } = useTranslation();

  const handleSubmit = async (ev: React.SyntheticEvent) => {
    ev.preventDefault();

    try {
      await auth.updateUser({
        name,
        avatarUrl,
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

  const isValid = form.current?.checkValidity();
  const { isSaving } = auth;

  return (
    <Scene title={t("Profile")} icon={<ProfileIcon color="currentColor" />}>
      <Heading>{t("Profile")}</Heading>

      <form onSubmit={handleSubmit} ref={form}>
        <SettingRow
          label={t("Photo")}
          name="avatarUrl"
          description={t("Choose a photo or image to represent yourself.")}
        >
          <ImageInput
            onSuccess={handleAvatarUpload}
            onError={handleAvatarError}
            src={avatarUrl}
          />
        </SettingRow>
        <SettingRow
          border={false}
          label={t("Full name")}
          name="name"
          description={t(
            "This could be your real name, or a nickname — however you’d like people to refer to you."
          )}
        >
          <Input
            id="name"
            autoComplete="name"
            value={name}
            onChange={handleNameChange}
            required
          />
        </SettingRow>

        <Button type="submit" disabled={isSaving || !isValid}>
          {isSaving ? `${t("Saving")}…` : t("Save")}
        </Button>
      </form>
    </Scene>
  );
};

export default observer(Profile);
