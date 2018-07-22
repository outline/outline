// @flow
import * as React from 'react';
import { inject, observer } from 'mobx-react';

import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import AuthStore from 'stores/AuthStore';

const ErrorSuspended = observer(({ auth }: { auth: AuthStore }) => {
  return (
    <CenteredContent>
      <PageTitle title="Your account has been suspended" />
      <h1>
        <span role="img" aria-label="Warning sign">
          ⚠️
        </span>{' '}
        Your account has been suspended
      </h1>

      <p>
        A team admin (<strong>{auth.suspendedContactEmail}</strong>) has
        suspended your account. To re-activate your account, please reach out to
        them directly.
      </p>
    </CenteredContent>
  );
});

export default inject('auth')(ErrorSuspended);
