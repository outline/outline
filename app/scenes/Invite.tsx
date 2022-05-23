import { observer } from "mobx-react";
import { LinkIcon, CloseIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { Role } from "@shared/types";
import Button from "~/components/Button";
import CopyToClipboard from "~/components/CopyToClipboard";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import InputSelectRole from "~/components/InputSelectRole";
import NudeButton from "~/components/NudeButton";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

const MAX_INVITES = 20;

type Props = {
  onSubmit: () => void;
};

type InviteRequest = {
  email: string;
  name: string;
  role: Role;
};

function Invite({ onSubmit }: Props) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [linkCopied, setLinkCopied] = React.useState<boolean>(false);
  const [invites, setInvites] = React.useState<InviteRequest[]>([
    {
      email: "",
      name: "",
      role: "member",
    },
    {
      email: "",
      name: "",
      role: "member",
    },
    {
      email: "",
      name: "",
      role: "member",
    },
  ]);
  const { users } = useStores();
  const { showToast } = useToasts();
  const user = useCurrentUser();
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const predictedDomain = user.email.split("@")[1];
  const can = usePolicy(team.id);

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setIsSaving(true);

      try {
        const data = await users.invite(invites);
        onSubmit();

        if (data.sent.length > 0) {
          showToast(t("We sent out your invites!"), {
            type: "success",
          });
        } else {
          showToast(t("Those email addresses are already invited"), {
            type: "success",
          });
        }
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [onSubmit, showToast, invites, t, users]
  );

  const handleChange = React.useCallback((ev, index) => {
    setInvites((prevInvites) => {
      const newInvites = [...prevInvites];
      newInvites[index][ev.target.name] = ev.target.value;
      return newInvites;
    });
  }, []);

  const handleAdd = React.useCallback(() => {
    if (invites.length >= MAX_INVITES) {
      showToast(
        t("Sorry, you can only send {{MAX_INVITES}} invites at a time", {
          MAX_INVITES,
        }),
        {
          type: "warning",
        }
      );
    }

    setInvites((prevInvites) => {
      const newInvites = [...prevInvites];
      newInvites.push({
        email: "",
        name: "",
        role: "member",
      });
      return newInvites;
    });
  }, [showToast, invites, t]);

  const handleRemove = React.useCallback(
    (ev: React.SyntheticEvent, index: number) => {
      ev.preventDefault();
      setInvites((prevInvites) => {
        const newInvites = [...prevInvites];
        newInvites.splice(index, 1);
        return newInvites;
      });
    },
    []
  );

  const handleCopy = React.useCallback(() => {
    setLinkCopied(true);
    showToast(t("Share link copied"), {
      type: "success",
    });
  }, [showToast, t]);

  const handleRoleChange = React.useCallback((role: Role, index: number) => {
    setInvites((prevInvites) => {
      const newInvites = [...prevInvites];
      newInvites[index]["role"] = role;
      return newInvites;
    });
  }, []);

  return (
    <form onSubmit={handleSubmit}>
      {team.guestSignin ? (
        <Text type="secondary">
          <Trans
            defaults="Invite team members or guests to join your knowledge base. Team members can sign in with {{signinMethods}} or use their email address."
            values={{
              signinMethods: team.signinMethods,
            }}
          />
        </Text>
      ) : (
        <Text type="secondary">
          <Trans
            defaults="Invite team members to join your knowledge base. They will need to sign in with {{signinMethods}}."
            values={{
              signinMethods: team.signinMethods,
            }}
          />{" "}
          {can.update && (
            <Trans>
              As an admin you can also{" "}
              <Link to="/settings/security">enable email sign-in</Link>.
            </Trans>
          )}
        </Text>
      )}
      {team.subdomain && (
        <CopyBlock>
          <Flex align="flex-end">
            <Input
              type="text"
              value={team.url}
              label={t("Want a link to share directly with your team?")}
              readOnly
              flex
            />
            &nbsp;&nbsp;
            <CopyToClipboard text={team.url} onCopy={handleCopy}>
              <Button
                type="button"
                icon={<LinkIcon />}
                style={{
                  marginBottom: "16px",
                }}
                neutral
              >
                {linkCopied ? t("Link copied") : t("Copy link")}
              </Button>
            </CopyToClipboard>
          </Flex>
        </CopyBlock>
      )}
      {invites.map((invite, index) => (
        <Flex key={index} gap={8}>
          <Input
            type="email"
            name="email"
            label={t("Email")}
            labelHidden={index !== 0}
            onChange={(ev) => handleChange(ev, index)}
            placeholder={`example@${predictedDomain}`}
            value={invite.email}
            required={index === 0}
            autoFocus={index === 0}
            flex
          />
          <Input
            type="text"
            name="name"
            label={t("Full name")}
            labelHidden={index !== 0}
            onChange={(ev) => handleChange(ev, index)}
            value={invite.name}
            required={!!invite.email}
          />
          <InputSelectRole
            onChange={(role: Role) => handleRoleChange(role, index)}
            value={invite.role}
            labelHidden={index !== 0}
            short
          />
          {index !== 0 && (
            <Remove>
              <Tooltip tooltip={t("Remove invite")} placement="top">
                <NudeButton onClick={(ev) => handleRemove(ev, index)}>
                  <CloseIcon />
                </NudeButton>
              </Tooltip>
            </Remove>
          )}
        </Flex>
      ))}

      <Flex justify="space-between">
        {invites.length <= MAX_INVITES ? (
          <Button type="button" onClick={handleAdd} neutral>
            <Trans>Add another</Trans>…
          </Button>
        ) : (
          <span />
        )}

        <Button
          type="submit"
          disabled={isSaving}
          data-on="click"
          data-event-category="invite"
          data-event-action="sendInvites"
        >
          {isSaving ? `${t("Inviting")}…` : t("Send Invites")}
        </Button>
      </Flex>
      <br />
    </form>
  );
}

const CopyBlock = styled("div")`
  margin: 2em 0;
  font-size: 14px;
  background: ${(props) => props.theme.secondaryBackground};
  border-radius: 8px;
  padding: 16px 16px 8px;
`;

const Remove = styled("div")`
  margin-top: 6px;
  position: absolute;
  right: -32px;
`;

export default observer(Invite);
