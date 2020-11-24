// @flow
import * as React from "react";
import CenteredContent from "components/CenteredContent";
import Empty from "components/Empty";
import PageTitle from "components/PageTitle";

const ErrorOffline = () => {
  return (
    <CenteredContent>
      <PageTitle title="Offline" />
      <h1>Offline</h1>
      <Empty>We were unable to load the document while offline.</Empty>
    </CenteredContent>
  );
};

export default ErrorOffline;
