// @flow
import * as React from 'react';
import Notice from '../../../shared/components/Notice';

type Props = {
  notice?: string,
};

export default function AuthErrors({ notice }: Props) {
  return (
    <React.Fragment>
      {notice === 'google-hd' && (
        <Notice>
          Sorry, Google sign in cannot be used with a personal email. Please try
          signing in with your company Google account.
        </Notice>
      )}
      {notice === 'hd-not-allowed' && (
        <Notice>
          Sorry, your Google apps domain is not allowed. Please try again with
          an allowed company domain.
        </Notice>
      )}
      {notice === 'auth-error' && (
        <Notice>
          Authentication failed - we were unable to sign you in at this time.
          Please try again.
        </Notice>
      )}
      {notice === 'azuread-no-organization' && (
        <Notice>
          Sorry, Microsoft sign in cannot be used with a non-Work account.
          Please try signing in with your company Microsoft or Office 365
          account.
        </Notice>
      )}
      {notice === 'azuread-no-userinfo' && (
        <Notice>
          Sorry, we couldn't get your user information. Please try again.
        </Notice>
      )}
    </React.Fragment>
  );
}
