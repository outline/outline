// @flow
import * as React from "react";
import NoticeAlert from "components/NoticeAlert";

type Props = {
  notice?: string,
};

export default function Notices({ notice }: Props) {
  return (
    <>
      {notice === "google-hd" && (
        <NoticeAlert>
          Sorry, Google sign in cannot be used with a personal email. Please try
          signing in with your Google Workspace account.
        </NoticeAlert>
      )}
      {notice === "hd-not-allowed" && (
        <NoticeAlert>
          Sorry, your Google apps domain is not allowed. Please try again with
          an allowed team domain.
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
      {notice === "auth-error" && (
        <NoticeAlert>
          Authentication failed - we were unable to sign you in at this time.
          Please try again.
        </NoticeAlert>
      )}
      {notice === "expired-token" && (
        <NoticeAlert>
          Sorry, it looks like that sign-in link is no longer valid, please try
          requesting another.
        </NoticeAlert>
      )}
      {notice === "suspended" && (
        <NoticeAlert>
          Your Outline account has been suspended. To re-activate your account,
          please contact a team admin.
        </NoticeAlert>
      )}
    </>
  );
}
