/* eslint-disable react/no-unescaped-entities */
import { WarningIcon } from "outline-icons";
import * as React from "react";
import { Trans } from "react-i18next";
import Notice from "~/components/Notice";
import useQuery from "~/hooks/useQuery";

export default function Notices() {
  const query = useQuery();
  const notice = query.get("notice");

  if (!notice) {
    return null;
  }

  return (
    <Notice icon={<WarningIcon color="currentcolor" />}>
      {notice === "domain-not-allowed" && (
        <Trans>
          The domain associated with your email address has not been allowed for
          this workspace.
        </Trans>
      )}
      {notice === "domain-required" && (
        <Trans>
          Unable to sign-in. Please navigate to your workspace's custom URL,
          then try to sign-in again.
          <hr />
          If you were invited to a workspace, you will find a link to it in the
          invite email.
        </Trans>
      )}
      {notice === "gmail-account-creation" && (
        <Trans>
          Sorry, a new account cannot be created with a personal Gmail address.
          <hr />
          Please use a Google Workspaces account instead.
        </Trans>
      )}
      {notice === "pending-deletion" && (
        <Trans>
          The workspace associated with your user is scheduled for deletion and
          cannot at accessed at this time.
        </Trans>
      )}
      {notice === "maximum-reached" && (
        <Trans>
          The workspace you authenticated with is not authorized on this
          installation. Try another?
        </Trans>
      )}
      {notice === "malformed-user-info" && (
        <Trans>
          We could not read the user info supplied by your identity provider.
        </Trans>
      )}
      {notice === "email-auth-required" && (
        <Trans>
          Your account uses email sign-in, please sign-in with email to
          continue.
        </Trans>
      )}
      {notice === "email-auth-ratelimit" && (
        <Trans>
          An email sign-in link was recently sent, please check your inbox or
          try again in a few minutes.
        </Trans>
      )}
      {(notice === "auth-error" || notice === "state-mismatch") && (
        <Trans>
          Authentication failed – we were unable to sign you in at this time.
          Please try again.
        </Trans>
      )}
      {notice === "invalid-authentication" && (
        <Trans>
          Authentication failed – you do not have permission to access this
          workspace.
        </Trans>
      )}
      {notice === "expired-token" && (
        <Trans>
          Sorry, it looks like that sign-in link is no longer valid, please try
          requesting another.
        </Trans>
      )}
      {(notice === "suspended" || notice === "user-suspended") && (
        <Trans>
          Your account has been suspended. To re-activate your account, please
          contact a workspace admin.
        </Trans>
      )}
      {notice === "authentication-provider-disabled" && (
        <Trans>
          Authentication failed – this login method was disabled by a team
          admin.
        </Trans>
      )}
      {notice === "invite-required" && (
        <Trans>
          The workspace you are trying to join requires an invite before you can
          create an account.
          <hr />
          Please request an invite from your workspace admin and try again.
        </Trans>
      )}
      {notice === "domain-not-allowed" && (
        <Trans>
          Sorry, your domain is not allowed. Please try again with an allowed
          workspace domain.
        </Trans>
      )}
    </Notice>
  );
}
