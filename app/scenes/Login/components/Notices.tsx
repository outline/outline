/* eslint-disable react/no-unescaped-entities */
import { WarningIcon } from "outline-icons";
import * as React from "react";
import { Trans } from "react-i18next";
import Notice from "~/components/Notice";
import useQuery from "~/hooks/useQuery";

function Message({ notice }: { notice: string }) {
  switch (notice) {
    case "domain-not-allowed":
      return (
        <Trans>
          The domain associated with your email address has not been allowed for
          this workspace.
        </Trans>
      );
    case "domain-required":
      return (
        <Trans>
          Unable to sign-in. Please navigate to your workspace's custom URL,
          then try to sign-in again.
          <hr />
          If you were invited to a workspace, you will find a link to it in the
          invite email.
        </Trans>
      );
    case "gmail-account-creation":
      return (
        <Trans>
          Sorry, a new account cannot be created with a personal Gmail address.
          <hr />
          Please use a Google Workspaces account instead.
        </Trans>
      );
    case "pending-deletion":
      return (
        <Trans>
          The workspace associated with your user is scheduled for deletion and
          cannot be accessed at this time.
        </Trans>
      );
    case "maximum-reached":
      return (
        <Trans>
          The workspace you authenticated with is not authorized on this
          installation. Try another?
        </Trans>
      );
    case "malformed-user-info":
      return (
        <Trans>
          We could not read the user info supplied by your identity provider.
        </Trans>
      );
    case "email-auth-required":
      return (
        <Trans>
          Your account uses email sign-in, please sign-in with email to
          continue.
        </Trans>
      );
    case "email-auth-ratelimit":
      return (
        <Trans>
          An email sign-in link was recently sent, please check your inbox or
          try again in a few minutes.
        </Trans>
      );
    case "auth-error":
    case "state-mismatch":
      return (
        <Trans>
          Authentication failed – we were unable to sign you in at this time.
          Please try again.
        </Trans>
      );
    case "invalid-authentication":
      return (
        <Trans>
          Authentication failed – you do not have permission to access this
          workspace.
        </Trans>
      );
    case "expired-token":
      return (
        <Trans>
          Sorry, it looks like that sign-in link is no longer valid, please try
          requesting another.
        </Trans>
      );
    case "user-suspended":
      return (
        <Trans>
          Your account has been suspended. To re-activate your account, please
          contact a workspace admin.
        </Trans>
      );
    case "team-suspended":
      return (
        <Trans>
          This workspace has been suspended. Please contact support to restore
          access.
        </Trans>
      );
    case "authentication-provider-disabled":
      return (
        <Trans>
          Authentication failed – this login method was disabled by a workspace
          admin.
        </Trans>
      );
    case "invite-required":
      return (
        <Trans>
          The workspace you are trying to join requires an invite before you can
          create an account.
          <hr />
          Please request an invite from your workspace admin and try again.
        </Trans>
      );
    default:
      return <Trans>Sorry, an unknown error occurred.</Trans>;
  }
}

export function Notices() {
  const query = useQuery();
  const notice = query.get("notice");

  if (!notice) {
    return null;
  }

  return (
    <Notice icon={<WarningIcon color="currentcolor" />}>
      <Message notice={notice} />
    </Notice>
  );
}
