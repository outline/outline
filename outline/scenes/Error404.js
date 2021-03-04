// @flow
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { Link } from "react-router-dom";
import CenteredContent from "components/CenteredContent";
import Empty from "components/Empty";
import PageTitle from "components/PageTitle";

const Error404 = () => {
  const { t } = useTranslation();

  return (
    <CenteredContent>
      <PageTitle title={t("Not found")} />
      <h1>{t("Not found")}</h1>
      <Empty>
        <Trans>
          We were unable to find the page you’re looking for. Go to the{" "}
          <Link to="/home">homepage</Link>?
        </Trans>
      </Empty>
    </CenteredContent>
  );
};

export default Error404;
