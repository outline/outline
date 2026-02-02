import { observer } from "mobx-react";
import * as React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import type { UserProfile as UserProfileData } from "@shared/types";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import LoadingIndicator from "~/components/LoadingIndicator";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useCurrentUser from "~/hooks/useCurrentUser";
import useRequest from "~/hooks/useRequest";
import { client } from "~/utils/ApiClient";

type UserAuthenticationPresentation = {
  id: string;
  provider: {
    id: string;
    name: string;
    providerId: string;
  };
  providerId: string;
  scopes: string[];
  profile: Record<string, unknown> | null;
  createdAt: string;
};

type UserPresentation = {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  profile?: UserProfileData | null;
  role: string;
  createdAt: string;
  updatedAt: string;
};

type UsersInfoResponse = {
  data: UserPresentation;
  authentications?: UserAuthenticationPresentation[];
  policies?: Array<{
    id: string;
    abilities: Record<string, boolean | string[]>;
  }>;
};

/**
 * Displays a user profile with optional admin-editable fields and auth details.
 *
 * @returns User profile scene.
 */
function UserProfile() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const currentUser = useCurrentUser();

  const [user, setUser] = React.useState<UserPresentation | null>(null);
  const [authentications, setAuthentications] = React.useState<
    UserAuthenticationPresentation[]
  >([]);
  const [profile, setProfile] = React.useState<UserProfileData>({});
  const [canReadEmail, setCanReadEmail] = React.useState<boolean | null>(null);
  const [password, setPassword] = React.useState("");
  const [passwordConfirm, setPasswordConfirm] = React.useState("");
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  const fetchProfile = React.useCallback(
    () => client.post<UsersInfoResponse>("/users.info", { id }),
    [id]
  );
  const { data, request, loading } = useRequest(fetchProfile, true);

  React.useEffect(() => {
    if (!data) {
      return;
    }
    setUser(data.data);
    setAuthentications(data.authentications ?? []);
    setProfile(data.data.profile ?? {});
    const policy = data.policies?.find((item) => item.id === data.data.id);
    const ability = policy?.abilities?.readEmail;
    setCanReadEmail(Array.isArray(ability) ? ability.length > 0 : !!ability);
  }, [data]);

  const canEditProfile = currentUser.isAdmin;
  const canEditPassword = currentUser.isAdmin && authentications.length === 0;

  const handleChange = (key: keyof UserProfileData) => (
    ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setProfile((prev) => ({
      ...prev,
      [key]: ev.target.value,
    }));
  };

  const handleSave = async () => {
    if (!user) {
      return;
    }
    await client.post("/users.update", {
      id: user.id,
      profile,
    });
    await request();
  };

  const handlePasswordSave = async () => {
    if (!user) {
      return;
    }
    if (!password) {
      setPasswordError(t("Password is required"));
      return;
    }
    if (password !== passwordConfirm) {
      setPasswordError(t("Passwords do not match"));
      return;
    }
    try {
      await client.post("/users.update", {
        id: user.id,
        password,
      });
      setPassword("");
      setPasswordConfirm("");
      setPasswordError(null);
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : t("Unable to update password")
      );
    }
  };

  if (loading && !user) {
    return (
      <Scene>
        <LoadingIndicator />
      </Scene>
    );
  }

  if (!user) {
    return (
      <Scene>
        <Text>{t("User not found")}</Text>
      </Scene>
    );
  }

  return (
    <Scene textTitle={user.name}>
      <Header align="center" gap={12}>
        <Avatar model={user} size={AvatarSize.XXLarge} />
        <div>
          <Heading>{user.name}</Heading>
          {user.email ? (
            <Text type="secondary">{user.email}</Text>
          ) : canReadEmail === false ? (
            <Text type="secondary">
              {t("Email is hidden by workspace settings.")}
            </Text>
          ) : (
            <Text type="secondary">{t("Email is not set.")}</Text>
          )}
        </div>
      </Header>

      <Section>
        <Heading as="h2">{t("Profile")}</Heading>
        <Fields>
          <Input
            label={t("Title")}
            value={profile.title ?? ""}
            onChange={handleChange("title")}
            disabled={!canEditProfile}
            placeholder={t("Title")}
            flex
          />
          <Input
            label={t("Department")}
            value={profile.department ?? ""}
            onChange={handleChange("department")}
            disabled={!canEditProfile}
            placeholder={t("Department")}
            flex
          />
          <Input
            label={t("Phone")}
            value={profile.phone ?? ""}
            onChange={handleChange("phone")}
            disabled={!canEditProfile}
            placeholder={t("Phone")}
            flex
          />
          <Input
            label={t("Location")}
            value={profile.location ?? ""}
            onChange={handleChange("location")}
            disabled={!canEditProfile}
            placeholder={t("Location")}
            flex
          />
          <Input
            label={t("Bio")}
            type="textarea"
            rows={4}
            value={profile.bio ?? ""}
            onChange={handleChange("bio")}
            disabled={!canEditProfile}
            placeholder={t("Bio")}
            flex
          />
        </Fields>
        {canEditProfile && (
          <Button onClick={handleSave}>{t("Save")}</Button>
        )}
        {!canEditProfile && (
          <Text type="secondary">
            {t("Only administrators can edit profile fields.")}
          </Text>
        )}
      </Section>

      <Section>
        <Heading as="h2">{t("Password")}</Heading>
        {canEditPassword ? (
          <>
            <Fields>
              <Input
                label={t("New password")}
                type="password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                placeholder={t("New password")}
                flex
              />
              <Input
                label={t("Confirm password")}
                type="password"
                value={passwordConfirm}
                onChange={(ev) => setPasswordConfirm(ev.target.value)}
                placeholder={t("Confirm password")}
                flex
              />
            </Fields>
            {passwordError && <Text type="error">{passwordError}</Text>}
            <Button onClick={handlePasswordSave}>{t("Save password")}</Button>
          </>
        ) : (
          <Text type="secondary">
            {t("Password login is only available for manually created users.")}
          </Text>
        )}
      </Section>

      <Section>
        <Heading as="h2">{t("Connected accounts")}</Heading>
        {authentications.length === 0 ? (
          <Text type="secondary">{t("No connected accounts")}</Text>
        ) : (
          authentications.map((auth) => (
            <AuthCard key={auth.id}>
              <Text weight="bold">{auth.provider.name}</Text>
              <Text type="secondary">{auth.providerId}</Text>
              {auth.profile && (
                <AuthProfile>
                  {JSON.stringify(auth.profile, null, 2)}
                </AuthProfile>
              )}
            </AuthCard>
          ))
        )}
      </Section>
    </Scene>
  );
}

const Header = styled(Flex)`
  margin-bottom: 24px;
`;

const Section = styled.div`
  margin-bottom: 32px;
`;

const Fields = styled.div`
  display: grid;
  gap: 12px;
  margin: 12px 0 16px;
`;

const AuthCard = styled.div`
  border: 1px solid ${(props) => props.theme.inputBorder};
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
`;

const AuthProfile = styled.pre`
  background: ${(props) => props.theme.backgroundSecondary};
  padding: 12px;
  border-radius: 4px;
  overflow: auto;
  margin-top: 8px;
`;

export default observer(UserProfile);
