import { observer } from "mobx-react";
import { ProfileIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import { UserChangeEmailDialog } from "~/components/UserDialogs";
import env from "~/env";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { UserValidation } from "@shared/validations";
import ImageInput from "./components/ImageInput";
import SettingRow from "./components/SettingRow";

const Profile = () => {
  const user = useCurrentUser();
  const { dialogs } = useStores();
  const [name, setName] = React.useState<string>(user.name);
  const { t } = useTranslation();

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
  };

  const handleKeyDown = (ev: React.KeyboardEvent) => {
    // The name saves on blur, so Enter saves it.
    if (
      ev.key === "Enter" &&
      !ev.nativeEvent.isComposing &&
      ev.target instanceof HTMLInputElement &&
      ev.currentTarget.contains(ev.target)
    ) {
      ev.preventDefault();
      ev.target.blur();
    }
  };

  const handleNameBlur = async () => {
    if (name === user.name) {
      return;
    }
    if (!name.trim()) {
      setName(user.name);
      return;
    }

    try {
      await user.save({ name });
      toast.success(t("Profile saved"));
    } catch (err) {
      setName(user.name);
      toast.error(errToString(err));
    }
  };

  const handleChangeEmail = () => {
    dialogs.openModal({
      title: t("Change email"),
      content: (
        <UserChangeEmailDialog user={user} onSubmit={dialogs.closeAllModals} />
      ),
    });
  };

  const handleNameChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setName(ev.target.value);
  };

  const handleAvatarChange = async (avatarUrl: string) => {
    await user.save({ avatarUrl });
    toast.success(t("Profile picture updated"));
  };

  const handleAvatarError = (error: string | null | undefined) => {
    toast.error(error || t("Unable to upload new profile picture"));
  };

  return (
    <Scene title={t("Profile")} icon={<ProfileIcon />}>
      <Heading>{t("Profile")}</Heading>
      <Text as="p" type="secondary">
        <Trans>Manage how you appear to other members of the workspace.</Trans>
      </Text>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <SettingRow
          label={t("Photo")}
          name="avatarUrl"
          description={t("Choose a photo or image to represent yourself.")}
        >
          <ImageInput
            alt={t("Profile picture")}
            onSuccess={handleAvatarChange}
            onError={handleAvatarError}
            model={user}
          />
        </SettingRow>
        <SettingRow
          border={env.EMAIL_ENABLED}
          label={t("Name")}
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
            onBlur={handleNameBlur}
            maxLength={UserValidation.maxNameLength}
            showCharacterCount
            required
          />
        </SettingRow>

        {env.EMAIL_ENABLED && (
          <SettingRow border={false} label={t("Email address")} name="email">
            <Input
              type="email"
              value={user.email}
              readOnly
              onClick={handleChangeEmail}
            />
          </SettingRow>
        )}
      </form>
    </Scene>
  );
};

export default observer(Profile);
