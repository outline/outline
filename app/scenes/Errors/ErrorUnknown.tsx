import { Trans, useTranslation } from "react-i18next";
import Flex from "@shared/components/Flex";
import Button from "~/components/Button";
import CenteredContent from "~/components/CenteredContent";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import PageTitle from "~/components/PageTitle";
import { navigateToHome } from "~/actions/definitions/navigation";
import useActionContext from "~/hooks/useActionContext";

const ErrorUnknown = () => {
  const { t } = useTranslation();
  const context = useActionContext();

  return (
    <CenteredContent>
      <PageTitle title={t("Something went wrong")} />
      <Heading>{t("Something went wrong")}</Heading>
      <Flex gap={20} style={{ maxWidth: 500 }} column>
        <Empty size="large">
          <Trans>
            Sorry, an unknown error occurred loading the page. Please try again
            or contact support if the issue persists.
          </Trans>
        </Empty>
        <Flex gap={8}>
          <Button action={navigateToHome} context={context} neutral hideIcon>
            {t("Home")}
          </Button>
        </Flex>
      </Flex>
    </CenteredContent>
  );
};

export default ErrorUnknown;
