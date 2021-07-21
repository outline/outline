// @flow
import { observer } from "mobx-react";
import { TeamIcon } from "outline-icons";
import * as React from "react";
import { useRef, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import Button from "components/Button";
import Flex from "components/Flex";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import Input, { LabelText } from "components/Input";
import Scene from "components/Scene";
import ImageUpload from "./components/ImageUpload";
import env from "env";
import useCurrentTeam from "hooks/useCurrentTeam";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";

function Details() {
  const { auth } = useStores();
  const { showToast } = useToasts();
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const form = useRef<?HTMLFormElement>();
  const [name, setName] = useState(team.name);
  const [subdomain, setSubdomain] = useState(team.subdomain);
  const [avatarUrl, setAvatarUrl] = useState();

  const handleSubmit = React.useCallback(
    async (event: ?SyntheticEvent<>) => {
      if (event) {
        event.preventDefault();
      }

      try {
        await auth.updateTeam({
          name,
          avatarUrl,
          subdomain,
        });
        showToast(t("Settings saved"), { type: "success" });
      } catch (err) {
        showToast(err.message, { type: "error" });
      }
    },
    [auth, showToast, name, avatarUrl, subdomain, t]
  );

  const handleNameChange = React.useCallback((ev: SyntheticInputEvent<*>) => {
    setName(ev.target.value);
  }, []);

  const handleSubdomainChange = React.useCallback(
    (ev: SyntheticInputEvent<*>) => {
      setSubdomain(ev.target.value.toLowerCase());
    },
    []
  );

  const handleAvatarUpload = React.useCallback(
    (avatarUrl: string) => {
      setAvatarUrl(avatarUrl);
      handleSubmit();
    },
    [handleSubmit]
  );

  const handleAvatarError = React.useCallback(
    (error: ?string) => {
      showToast(error || t("Unable to upload new logo"));
    },
    [showToast, t]
  );

  const isValid = form.current && form.current.checkValidity();

  return (
    <Scene title={t("Details")} icon={<TeamIcon color="currentColor" />}>
      <Heading>{t("Details")}</Heading>
      <HelpText>
        <Trans>
          These details affect the way that your Outline appears to everyone on
          the team.
        </Trans>
      </HelpText>

      <ProfilePicture column>
        <LabelText>{t("Logo")}</LabelText>
        <AvatarContainer>
          <ImageUpload
            onSuccess={handleAvatarUpload}
            onError={handleAvatarError}
            submitText={t("Crop logo")}
            borderRadius={0}
          >
            <Avatar src={avatarUrl} />
            <Flex auto align="center" justify="center">
              <Trans>Upload</Trans>
            </Flex>
          </ImageUpload>
        </AvatarContainer>
      </ProfilePicture>
      <form onSubmit={handleSubmit} ref={form}>
        <Input
          label={t("Name")}
          name="name"
          autoComplete="organization"
          value={name}
          onChange={handleNameChange}
          required
          short
        />
        {env.SUBDOMAINS_ENABLED && (
          <>
            <Input
              label={t("Subdomain")}
              name="subdomain"
              value={subdomain || ""}
              onChange={handleSubdomainChange}
              autoComplete="off"
              minLength={4}
              maxLength={32}
              short
            />
            {subdomain && (
              <HelpText small>
                <Trans>Your knowledge base will be accessible at</Trans>{" "}
                <strong>{subdomain}.getoutline.com</strong>
              </HelpText>
            )}
          </>
        )}
        <Button type="submit" disabled={auth.isSaving || !isValid}>
          {auth.isSaving ? `${t("Saving")}…` : t("Save")}
        </Button>
      </form>
    </Scene>
  );
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
  background: ${(props) => props.theme.white};

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

export default observer(Details);
