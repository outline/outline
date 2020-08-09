// @flow
import * as React from "react";
import type { Location } from "react-router-dom";
import CenteredContent from "components/CenteredContent";
import LoadingPlaceholder from "components/LoadingPlaceholder";
import PageTitle from "components/PageTitle";
import Container from "./Container";

type Props = {|
  location: Location,
|};

export default function Loading({ location }: Props) {
  return (
    <Container column auto>
      <PageTitle title={location.state ? location.state.title : "Untitled"} />
      <CenteredContent>
        <LoadingPlaceholder />
      </CenteredContent>
    </Container>
  );
}
