import { observer } from "mobx-react";
import { ProfileIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { TeamPreference, type OIDCProfileSync } from "@shared/types";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import { UserChangeEmailDialog } from "~/components/UserDialogs";
import env from "~/env";
import useCurrentUser from "~/hooks/useCurrentUser";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import ImageInput from "./components/ImageInput";
import SettingRow from "./components/SettingRow";

const ProfileComponent = () => {
  const user = useCurrentUser();
  const team = useCurrentTeam();
  const { dialogs } = useStores();
  const form = React.useRef<HTMLFormElement>(null);
  const [name, setName] = React.useState<string>(user.name);
  const { t } = useTranslation();
  const [profileFields, setProfileFields] = React.useState({
    title: user.profile?.title ?? "",
    department: user.profile?.department ?? "",
    phone: user.profile?.phone ?? "",
    internalPhone: user.profile?.internalPhone ?? "",
    mobilePhone: user.profile?.mobilePhone ?? "",
  });
  const canChangeName =
    user.isAdmin || team.getPreference(TeamPreference.MembersCanChangeName);
  const oidcProfileSync =
    (team.getPreference(TeamPreference.OIDCProfileSync) as OIDCProfileSync | undefined) ??
    undefined;
  const titleLocked = !!oidcProfileSync?.title;
  const departmentLocked = !!oidcProfileSync?.department;

  const handleSubmit = async (ev: React.SyntheticEvent) => {
    ev.preventDefault();

    if (!form.current?.checkValidity()) {
      return;
    }

    try {
      const payload: {
        name?: string;
        profile: typeof profileFields;
      } = {
        profile: profileFields,
      };

      if (canChangeName) {
        payload.name = name;
      }

      await user.save(payload);
      toast.success(t("Profile saved"));
    } catch (err: any) {
      toast.error(err?.message || t("Failed to save profile"));
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

  const handleProfileFieldChange = React.useCallback(
    (key: keyof typeof profileFields) =>
      (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = ev.target.value;
        setProfileFields((prev) => ({
          ...prev,
          [key]: value,
        }));
      },
    []
  );

  React.useEffect(() => {
    setProfileFields({
      title: user.profile?.title ?? "",
      department: user.profile?.department ?? "",
      phone: user.profile?.phone ?? "",
      internalPhone: user.profile?.internalPhone ?? "",
      mobilePhone: user.profile?.mobilePhone ?? "",
    });
  }, [user.profile]);

  const { isSaving } = user;

  // Check form validity whenever name changes or form is mounted
  const isValid = React.useMemo(() => {
    if (!form.current) {
      return true;
    }
    return form.current.checkValidity();
  }, [name]);

  const showTitleLockNotice = titleLocked && profileFields.title;
  const showDepartmentLockNotice = departmentLocked && profileFields.department;

  return (
    <Scene title={t("Profile")} icon={<ProfileIcon />}>
      <Heading>{t("Profile")}</Heading>
      <Text as="p" type="secondary">
        <Trans>Manage how you appear to other members of the workspace.</Trans>
      </Text>

      <form onSubmit={handleSubmit} ref={form}>
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
            name="name"
            autoComplete="name"
            value={name}
            onChange={handleNameChange}
            required
            disabled={!canChangeName}
          />
          {!canChangeName && (
            <Text as="p" type="secondary">
              {t("Only an administrator can change your name.")}
            </Text>
          )}
        </SettingRow>

        {env.EMAIL_ENABLED && (
          <SettingRow border={false} label={t("Email address")} name="email">
            <Input
              id="email"
              name="email"
              type="email"
              value={user.email}
              readOnly
              onClick={handleChangeEmail}
            />
          </SettingRow>
        )}

        <SettingRow
          border={false}
          label={t("Contact information")}
          name="contactInformation"
          description={t("Help your teammates know how to reach you.")}
        >
          <ContactFields>
            <Input
              id="profileTitle"
              name="title"
              label={t("Job title")}
              placeholder={t("e.g. Account Manager")}
              value={profileFields.title}
              disabled={titleLocked}
              onChange={handleProfileFieldChange("title")}
            />
            {titleLocked && (
              <FieldNote type="secondary">
                {t("This value is managed by your identity provider.")}
              </FieldNote>
            )}

            <Input
              id="profileDepartment"
              name="department"
              label={t("Department")}
              placeholder={t("e.g. Sales")}
              value={profileFields.department}
              disabled={departmentLocked}
              onChange={handleProfileFieldChange("department")}
            />
            {departmentLocked && (
              <FieldNote type="secondary">
                {t("This value is managed by your identity provider.")}
              </FieldNote>
            )}

            <Input
              id="profileWorkPhone"
              name="phone"
              label={t("Work phone")}
              placeholder="+1 555 123 4567"
              value={profileFields.phone}
              onChange={handleProfileFieldChange("phone")}
            />

            <Input
              id="profileInternalPhone"
              name="internalPhone"
              label={t("Internal phone")}
              placeholder="1234"
              value={profileFields.internalPhone}
              onChange={handleProfileFieldChange("internalPhone")}
            />

            <Input
              id="profileMobilePhone"
              name="mobilePhone"
              label={t("Mobile phone")}
              placeholder="+1 555 987 6543"
              value={profileFields.mobilePhone}
              onChange={handleProfileFieldChange("mobilePhone")}
            />
          </ContactFields>
        </SettingRow>

        <SettingRow
          border={false}
          label={t("CRM link")}
          name="crmLink"
          description={t(
            "Admins can configure a domain-specific CRM link for quick access."
          )}
        >
          {user.domainCrmUrl ? (
            <CrmLink href={user.domainCrmUrl} target="_blank" rel="noopener noreferrer">
              {user.domainCrmUrl}
            </CrmLink>
          ) : (
            <Text as="p" type="secondary">
              {t("No CRM link has been configured for your domain yet.")}
            </Text>
          )}
        </SettingRow>

        <Button type="submit" disabled={isSaving || !isValid}>
          {isSaving ? `${t("Saving")}…` : t("Save")}
        </Button>
      </form>
    </Scene>
  );
};

const Profile = observer(ProfileComponent);

export default Profile;

const ContactFields = styled.div`
  display: grid;
  gap: 12px;
`;

const FieldNote = styled(Text)`
  margin-top: -8px;
  font-size: 12px;
`;

const CrmLink = styled.a`
  font-weight: 600;
  word-break: break-all;
  color: ${(props) => props.theme.textHighlight};
`;
