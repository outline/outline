import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import Empty from "~/components/Empty";
import Notice from "~/components/Notice";
import Scene from "~/components/Scene";

const Error402 = () => {
  const location = useLocation<{ title?: string }>();
  const { t } = useTranslation();
  const title = location.state?.title ?? t("Payment Required");

  return (
    <Scene title={title}>
      <h1>{title}</h1>
      <Empty>
        <Notice>
          This document cannot be viewed with the current edition. Please
          upgrade to a paid license to restore access.
        </Notice>
      </Empty>
    </Scene>
  );
};

export default Error402;
