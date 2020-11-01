// @flow
import * as React from "react";
import { Link } from "react-router-dom";
import CenteredContent from "components/CenteredContent";
import Empty from "components/Empty";
import PageTitle from "components/PageTitle";

const Error404 = () => {
  return (
    <CenteredContent>
      <PageTitle title="Not Found" />
      <h1>Not found</h1>
      <Empty>
        We were unable to find the page you’re looking for. Go to the{" "}
        <Link to="/home">homepage</Link>?
      </Empty>
    </CenteredContent>
  );
};

export default Error404;
