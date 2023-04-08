import { WarningIcon } from "outline-icons";
import * as React from "react";
import { Trans } from "react-i18next";
import Notice from "~/components/Notice";
import useQuery from "~/hooks/useQuery";

export default function Notices() {
  const query = useQuery();
  const notice = query.get("notice");
  const description = query.get("description");

  if (!notice) {
    return null;
  }

  return (
    <Notice icon={<WarningIcon color="currentcolor" />}>
      {notice === "domain-required" && (
        <Trans>
          Unable to sign-in. Please navigate to your team's custom URL, then try
          to sign-in again.
          <hr />
          If you were invited to a team, you will find a link to it in the
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
      {notice === "maximum-teams" && (
        <Trans>
          The team you authenticated with is not authorized on this
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
      {(notice === "auth-error" || notice === "state-mismatch") &&
        (description ? (
          <>{description}</>
        ) : (
          <Trans>
            Authentication failed – we were unable to sign you in at this time.
            Please try again.
          </Trans>
        ))}
      {notice === "invalid-authentication" &&
        (description ? (
          <>{description}</>
        ) : (
          <Trans>
            Authentication failed – you do not have permission to access this
            team.
          </Trans>
        ))}
      {notice === "expired-token" && (
        <Trans>
          Sorry, it looks like that sign-in link is no longer valid, please try
          requesting another.
        </Trans>
      )}
      {notice === "suspended" && (
        <Trans>
          Your account has been suspended. To re-activate your account, please
          contact a team admin.
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
          The team you are trying to join requires an invite before you can
          create an account.
          <hr />
          Please request an invite from your team admin and try again.
        </Trans>
      )}
      {notice === "domain-not-allowed" && (
        <Trans>
          Sorry, your domain is not allowed. Please try again with an allowed
          team domain.
        </Trans>
      )}
    </Notice>
  );
}
