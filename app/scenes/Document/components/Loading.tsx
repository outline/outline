import * as React from "react";
import { useTranslation } from "react-i18next";
import CenteredContent from "components/CenteredContent";
import PageTitle from "components/PageTitle";
import PlaceholderDocument from "components/PlaceholderDocument";
import Container from "./Container";
import type { LocationWithState } from "types";

type Props = {
  location: LocationWithState;
};

export default function Loading({ location }: Props) {
  const { t } = useTranslation();
  return (
    <Container column auto>
      <PageTitle
        title={location.state ? location.state.title : t("Untitled")}
      />
      <CenteredContent>
        <PlaceholderDocument />
      </CenteredContent>
    </Container>
  );
}
