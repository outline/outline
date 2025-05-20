import { observer } from "mobx-react";
import { useTranslation, Trans } from "react-i18next";
import CenteredContent from "~/components/CenteredContent";
import Heading from "~/components/Heading";
import PageTitle from "~/components/PageTitle";
import useStores from "~/hooks/useStores";

const ErrorSuspended = () => {
  const { t } = useTranslation();
  const { auth } = useStores();

  return (
    <CenteredContent>
      <PageTitle title={t("Your account has been suspended")} />
      <Heading>
        <span role="img" aria-label={t("Warning Sign")}>
          ⚠️
        </span>{" "}
        {t("Your account has been suspended")}
      </Heading>

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
