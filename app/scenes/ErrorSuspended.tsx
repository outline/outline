import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import CenteredContent from "~/components/CenteredContent";
import PageTitle from "~/components/PageTitle";
import useStores from "~/hooks/useStores";

const ErrorSuspended = () => {
  const { t } = useTranslation();
  const { auth } = useStores();

  return (
    <CenteredContent>
      <PageTitle title={t("Your account has been suspended")} />
      <h1>
        <span role="img" aria-label={t("Warning Sign")}>
          ⚠️
        </span>{" "}
        {t("Your account has been suspended")}
      </h1>

      <p>
        <Trans
          defaults="A workspace admin (<em>{{ suspendedContactEmail }}</em>) has suspended your account. To re-activate your account, please reach out to them directly."
          values={{
            suspendedContactEmail: auth.suspendedContactEmail,
          }}
          components={{
            em: <strong />,
          }}
        />
      </p>
    </CenteredContent>
  );
};

export default observer(ErrorSuspended);
