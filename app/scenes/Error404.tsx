import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { Link } from "react-router-dom";
import Empty from "~/components/Empty";
import Scene from "~/components/Scene";
import { homePath } from "~/utils/routeHelpers";

const Error404 = () => {
  const { t } = useTranslation();
  return (
    <Scene title={t("Not Found")}>
      <h1>{t("Not Found")}</h1>
      <Empty>
        <Trans>
          We were unable to find the page you’re looking for. Go to the{" "}
          <Link to={homePath()}>homepage</Link>?
        </Trans>
      </Empty>
    </Scene>
  );
};

export default Error404;
