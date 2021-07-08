// @flow
import { observer } from "mobx-react";
import { TeamIcon } from "outline-icons";
import * as React from "react";
import { useRef, useState } from "react";
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

function Details() {
  const { auth, ui } = useStores();
  const team = useCurrentTeam();

  const form = useRef<?HTMLFormElement>();
  const [name, setName] = useState(team?.name);
  const [subdomain, setSubdomain] = useState(team?.subdomain);
  const [avatarUrl, setAvatarUrl] = useState();

  const handleSubmit = React.useCallback(
    async (event: ?SyntheticEvent<>) => {
      if (event) {
        event.preventDefault();
      }

      try {
        await auth.updateTeam({
          name: name,
          avatarUrl: avatarUrl,
          subdomain: subdomain,
        });
        ui.showToast("Settings saved", { type: "success" });
      } catch (err) {
        ui.showToast(err.message, { type: "error" });
      }
    },
    [auth, ui, name, avatarUrl, subdomain]
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
      ui.showToast(error || "Unable to upload new logo");
    },
    [ui]
  );

  const isValid = form.current && form.current.checkValidity();

  if (!team) return null;

  return (
    <Scene title="Details" icon={<TeamIcon color="currentColor" />}>
      <Heading>Details</Heading>
      <HelpText>
        These details affect the way that your Outline appears to everyone on
        the team.
      </HelpText>

      <ProfilePicture column>
        <LabelText>Logo</LabelText>
        <AvatarContainer>
          <ImageUpload
            onSuccess={handleAvatarUpload}
            onError={handleAvatarError}
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
      <form onSubmit={handleSubmit} ref={form}>
        <Input
          label="Name"
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
              label="Subdomain"
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
                Your knowledge base will be accessible at{" "}
                <strong>{subdomain}.getoutline.com</strong>
              </HelpText>
            )}
          </>
        )}
        <Button type="submit" disabled={auth.isSaving || !isValid}>
          {auth.isSaving ? "Saving…" : "Save"}
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
