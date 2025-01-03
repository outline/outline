import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UserRole } from "@shared/types";
import User from "~/models/User";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Input from "~/components/Input";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import Text from "./Text";

type Props = {
  user: User;
  onSubmit: () => void;
};

export function UserChangeRoleDialog({
  user,
  role,
  onSubmit,
}: Props & {
  role: UserRole;
}) {
  const { t } = useTranslation();
  const { users } = useStores();

  const handleSubmit = async () => {
    await users.updateRole(user, role);
    onSubmit();
  };

  let accessNote;
  switch (role) {
    case UserRole.Admin:
      accessNote = t("Admins can manage the workspace and access billing.");
      break;
    case UserRole.Member:
      accessNote = t("Editors can create, edit, and comment on documents.");
      break;
    case UserRole.Viewer:
      accessNote = t("Viewers can only view and comment on documents.");
      break;
  }

  return (
    <ConfirmationDialog onSubmit={handleSubmit} savingText={`${t("Saving")}…`}>
      {t("Are you sure you want to make {{ userName }} a {{ role }}?", {
        role,
        userName: user.name,
      })}{" "}
      {accessNote}
    </ConfirmationDialog>
  );
}

export function UserDeleteDialog({ user, onSubmit }: Props) {
  const { t } = useTranslation();

  const handleSubmit = async () => {
    await user.delete();
    onSubmit();
  };

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("I understand, delete")}
      savingText={`${t("Deleting")}…`}
      danger
    >
      {t(
        "Are you sure you want to permanently delete {{ userName }}? This operation is unrecoverable, consider suspending the user instead.",
        {
          userName: user.name,
        }
      )}
    </ConfirmationDialog>
  );
}

export function UserSuspendDialog({ user, onSubmit }: Props) {
  const { t } = useTranslation();
  const { users } = useStores();

  const handleSubmit = async () => {
    await users.suspend(user);
    onSubmit();
  };

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      savingText={`${t("Saving")}…`}
      danger
    >
      {t(
        "Are you sure you want to suspend {{ userName }}? Suspended users will be prevented from logging in.",
        {
          userName: user.name,
        }
      )}
    </ConfirmationDialog>
  );
}

export function UserChangeNameDialog({ user, onSubmit }: Props) {
  const { t } = useTranslation();
  const [name, setName] = React.useState<string>(user.name);

  const handleSubmit = async () => {
    await user.save({ name });
    onSubmit();
  };

  const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setName(ev.target.value);
  };

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("Save")}
      savingText={`${t("Saving")}…`}
      disabled={!name}
    >
      <Input
        type="text"
        name="name"
        label={t("New name")}
        onChange={handleChange}
        error={!name ? t("Name can't be empty") : undefined}
        value={name}
        autoSelect
        required
        flex
      />
    </ConfirmationDialog>
  );
}

export function UserChangeEmailDialog({ user, onSubmit }: Props) {
  const { t } = useTranslation();
  const actor = useCurrentUser();
  const [email, setEmail] = React.useState<string>(user.email);
  const [error, setError] = React.useState<string | undefined>();

  const handleSubmit = async () => {
    try {
      await client.post(`/users.updateEmail`, { id: user.id, email });
      onSubmit();
      toast.info(
        actor.id === user.id
          ? t("Check your email to verify the new address.")
          : t("The email will be changed once verified.")
      );
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(ev.target.value);
  };

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("Save")}
      savingText={`${t("Saving")}…`}
      disabled={!email || email === user.email}
    >
      <Text as="p">
        {actor.id === user.id ? (
          <Trans>
            You will receive an email to verify your new address. It must be
            unique in the workspace.
          </Trans>
        ) : (
          <Trans>
            A confirmation email will be sent to the new address before it is
            changed.
          </Trans>
        )}
      </Text>
      <Input
        type="email"
        name="email"
        label={t("New email")}
        onChange={handleChange}
        error={!email ? t("Email can't be empty") : error}
        value={email}
        autoSelect
        required
        flex
      />
    </ConfirmationDialog>
  );
}
