// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import CenteredContent from "components/CenteredContent";
import Empty from "components/Empty";
import PageTitle from "components/PageTitle";

const ErrorOffline = () => {
  const { t } = useTranslation();

  return (
    <CenteredContent>
      <PageTitle title={t("Offline")} />
      <h1>{t("Offline")}</h1>
      <Empty>{t("We were unable to load the document while offline.")}</Empty>
    </CenteredContent>
  );
};

export default ErrorOffline;
