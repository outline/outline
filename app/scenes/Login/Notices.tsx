import * as React from "react";
import NoticeAlert from "~/components/NoticeAlert";
import useQuery from "~/hooks/useQuery";

export default function Notices() {
  const query = useQuery();
  const notice = query.get("notice");
  const description = query.get("description");

  return (
    <>
      {notice === "domain-required" && (
        <NoticeAlert>
          Unable to sign-in. Please navigate to your team's custom URL, then try
          to sign-in again.
          <hr />
          If you were invited to a team, you will find a link to it in the
          invite email.
        </NoticeAlert>
      )}
      {notice === "gmail-account-creation" && (
        <NoticeAlert>
          Sorry, a new account cannot be created with a personal Gmail address.
          <hr />
          Please use a Google Workspaces account instead.
        </NoticeAlert>
      )}
      {notice === "maximum-teams" && (
        <NoticeAlert>
          The team you authenticated with is not authorized on this
          installation. Try another?
        </NoticeAlert>
      )}
      {notice === "malformed-user-info" && (
        <NoticeAlert>
          We could not read the user info supplied by your identity provider.
        </NoticeAlert>
      )}
      {notice === "email-auth-required" && (
        <NoticeAlert>
          Your account uses email sign-in, please sign-in with email to
          continue.
        </NoticeAlert>
      )}
      {notice === "email-auth-ratelimit" && (
        <NoticeAlert>
          An email sign-in link was recently sent, please check your inbox or
          try again in a few minutes.
        </NoticeAlert>
      )}
      {(notice === "auth-error" || notice === "state-mismatch") &&
        (description ? (
          <NoticeAlert>{description}</NoticeAlert>
        ) : (
          <NoticeAlert>
            Authentication failed – we were unable to sign you in at this time.
            Please try again.
          </NoticeAlert>
        ))}
      {notice === "invalid-authentication" &&
        (description ? (
          <NoticeAlert>{description}</NoticeAlert>
        ) : (
          <NoticeAlert>
            Authentication failed – you do not have permission to access this
            team.
          </NoticeAlert>
        ))}
      {notice === "expired-token" && (
        <NoticeAlert>
          Sorry, it looks like that sign-in link is no longer valid, please try
          requesting another.
        </NoticeAlert>
      )}
      {notice === "suspended" && (
        <NoticeAlert>
          Your account has been suspended. To re-activate your account, please
          contact a team admin.
        </NoticeAlert>
      )}
      {notice === "authentication-provider-disabled" && (
        <NoticeAlert>
          Authentication failed – this login method was disabled by a team
          admin.
        </NoticeAlert>
      )}
      {notice === "invite-required" && (
        <NoticeAlert>
          The team you are trying to join requires an invite before you can
          create an account.
          <hr />
          Please request an invite from your team admin and try again.
        </NoticeAlert>
      )}
      {notice === "domain-not-allowed" && (
        <NoticeAlert>
          Sorry, your domain is not allowed. Please try again with an allowed
          team domain.
        </NoticeAlert>
      )}
    </>
  );
}
