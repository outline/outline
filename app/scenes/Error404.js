// @flow
import * as React from 'react';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import Empty from 'components/Empty';

const Error404 = () => {
  return (
    <CenteredContent>
      <PageTitle title="Not Found" />
      <h1>Not Found</h1>
      <Empty>We were unable to find the page you’re looking for.</Empty>
      <p>
        Go to <a href="/">homepage</a>.
      </p>
    </CenteredContent>
  );
};

export default Error404;
