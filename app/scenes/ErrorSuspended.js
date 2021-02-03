// @flow
import { inject, observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";

import AuthStore from "stores/AuthStore";
import CenteredContent from "components/CenteredContent";
import PageTitle from "components/PageTitle";

const ErrorSuspended = ({ auth }: { auth: AuthStore }) => {
  const { t } = useTranslation();

  return (
    <CenteredContent>
      <PageTitle title={t("Your account has been suspended")} />
      <h1>
        <span role="img" aria-label="Warning sign">
          ⚠️
        </span>{" "}
        {t("Your account has been suspended")}
      </h1>

      <p>
        <Trans
          defaults="A team admin (<em>{{ suspendedContactEmail }}</em>) has suspended your account. To re-activate your account, please reach out to them directly."
          values={{ suspendedContactEmail: auth.suspendedContactEmail }}
          components={{ em: <strong /> }}
        />
      </p>
    </CenteredContent>
  );
};

export default inject("auth")(observer(ErrorSuspended));
