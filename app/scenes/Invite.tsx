import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import pluralize from "pluralize";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import { UserRole } from "@shared/types";
import { parseEmail } from "@shared/utils/email";
import { UserValidation } from "@shared/validations";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import InputSelect from "~/components/InputSelect";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";

type Props = {
  onSubmit: () => void;
};

type InviteRequest = {
  email: string;
  name: string;
};

function Invite({ onSubmit }: Props) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [invites, setInvites] = React.useState<InviteRequest[]>([
    {
      email: "",
      name: "",
    },
  ]);
  const { users, collections } = useStores();
  const user = useCurrentUser();
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const predictedDomain = parseEmail(user.email).domain;
  const can = usePolicy(team);
  const [role, setRole] = React.useState<UserRole>(UserRole.Member);

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setIsSaving(true);

      try {
        const response = await users.invite(
          invites.filter((i) => i.email).map((memo) => ({ ...memo, role }))
        );
        onSubmit();

        if (response.length > 0) {
          toast.success(t("We sent out your invites!"));
        } else {
          toast.message(t("Those email addresses are already invited"));
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsSaving(false);
      }
    },
    [onSubmit, invites, role, t, users]
  );

  const handleChange = React.useCallback((ev, index: number) => {
    setInvites((prevInvites) => {
      const newInvites = [...prevInvites];
      newInvites[index][ev.target.name as keyof InviteRequest] =
        ev.target.value;
      return newInvites;
    });
  }, []);

  const handleAdd = React.useCallback(() => {
    if (invites.length >= UserValidation.maxInvitesPerRequest) {
      toast.message(
        t("Sorry, you can only send {{MAX_INVITES}} invites at a time", {
          MAX_INVITES: UserValidation.maxInvitesPerRequest,
        })
      );
    }

    setInvites((prevInvites) => {
      const newInvites = [...prevInvites];
      newInvites.push({
        email: "",
        name: "",
      });
      return newInvites;
    });
  }, [invites, t]);

  const handleKeyDown = React.useCallback(
    (ev: React.KeyboardEvent<HTMLInputElement>) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        handleAdd();
      }
    },
    [handleAdd]
  );

  const roleName = pluralize(role);
  const collectionCount = collections.nonPrivate.length;
  const collectionAccessNote = collectionCount ? (
    <span>
      <Trans>Invited {{ roleName }} will receive access to</Trans>{" "}
      <Tooltip
        content={
          <>
            {collections.nonPrivate.map((collection) => (
              <li key={collection.id}>{collection.name}</li>
            ))}
          </>
        }
      >
        <strong>
          <Trans>{{ collectionCount }} collections</Trans>
        </strong>
      </Tooltip>
      .{" "}
    </span>
  ) : undefined;

  const options = React.useMemo(() => {
    const memo = [];

    if (user.isAdmin) {
      memo.push({
        label: t("Admin"),
        description: t("Can manage all workspace settings"),
        value: UserRole.Admin,
      });
    }

    return [
      ...memo,
      {
        label: t("Editor"),
        description: t("Can create, edit, and delete documents"),
        value: UserRole.Member,
      },
      {
        label: t("Viewer"),
        description: t("Can view and comment"),
        value: UserRole.Viewer,
      },
    ];
  }, [t, user]);

  return (
    <form onSubmit={handleSubmit}>
      <Flex gap={8} column>
        {team.guestSignin ? (
          <Text as="p" type="secondary">
            <Trans
              defaults="Invite people to join your workspace. They can sign in with {{signinMethods}} or use their email address."
              values={{
                signinMethods: team.signinMethods,
              }}
            />{" "}
            {collectionAccessNote}
          </Text>
        ) : (
          <Text as="p" type="secondary">
            <Trans
              defaults="Invite members to join your workspace. They will need to sign in with {{signinMethods}}."
              values={{
                signinMethods: team.signinMethods,
              }}
            />{" "}
            {collectionAccessNote}
            {can.update && (
              <Trans>
                As an admin you can also{" "}
                <Link to="/settings/security">enable email sign-in</Link>.
              </Trans>
            )}
          </Text>
        )}
        <Flex gap={12} column>
          <InputSelect
            label={t("Invite as")}
            ariaLabel={t("Role")}
            options={options}
            onChange={(r) => setRole(r as UserRole)}
            value={role}
          />

          <ResizingHeightContainer style={{ minHeight: 72, marginBottom: 8 }}>
            {invites.map((invite, index) => (
              <Flex key={index} gap={8}>
                <StyledInput
                  type="email"
                  name="email"
                  label={t("Email")}
                  labelHidden={index !== 0}
                  onKeyDown={handleKeyDown}
                  onChange={(ev) => handleChange(ev, index)}
                  placeholder={`name@${predictedDomain}`}
                  value={invite.email}
                  required={index === 0}
                  autoFocus
                  flex
                />
                <StyledInput
                  type="text"
                  name="name"
                  label={t("Name")}
                  labelHidden={index !== 0}
                  onKeyDown={handleKeyDown}
                  onChange={(ev) => handleChange(ev, index)}
                  value={invite.name}
                  required={!!invite.email}
                  flex
                />
              </Flex>
            ))}
          </ResizingHeightContainer>
        </Flex>

        <Flex justify="space-between">
          {invites.length <= UserValidation.maxInvitesPerRequest ? (
            <Button
              type="button"
              onClick={handleAdd}
              icon={<PlusIcon />}
              neutral
            >
              {t("Add another")}
            </Button>
          ) : null}
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
      </Flex>
    </form>
  );
}

const StyledInput = styled(Input)`
  margin-bottom: -4px;
  min-width: 0;
  flex-shrink: 1;
`;

export default observer(Invite);
