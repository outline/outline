import { useTranslation } from "react-i18next";
import CenteredContent from "~/components/CenteredContent";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import PageTitle from "~/components/PageTitle";

const ErrorOffline = () => {
  const { t } = useTranslation();
  return (
    <CenteredContent>
      <PageTitle title={t("Offline")} />
      <Heading>{t("Offline")}</Heading>
      <Empty>{t("We were unable to load the document while offline.")}</Empty>
    </CenteredContent>
  );
};

export default ErrorOffline;
