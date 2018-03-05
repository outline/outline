// @flow
import React from 'react';

import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';

const ErrorSuspended = () => (
  <CenteredContent>
    <PageTitle title="Your account has been suspended" />
    <h1>
      <span role="img" aria-label="Warning sign">
        ⚠️
      </span>{' '}
      Your account has been suspended
    </h1>

    <p>
      Team admin has suspended your account. To re-activate your account, please
      reach out to them directly.
    </p>
  </CenteredContent>
);

export default ErrorSuspended;
