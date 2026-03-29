import { Trans, useTranslation } from "react-i18next";
import Button from "~/components/Button";
import CenteredContent from "~/components/CenteredContent";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import PageTitle from "~/components/PageTitle";
import { navigateToHome } from "~/actions/definitions/navigation";
import { HStack } from "~/components/primitives/HStack";
import { VStack } from "~/components/primitives/VStack";

const ErrorUnknown = () => {
  const { t } = useTranslation();

  return (
    <CenteredContent>
      <PageTitle title={t("Something went wrong")} />
      <Heading>{t("Something went wrong")}</Heading>
      <VStack spacing={20} style={{ maxWidth: 500 }} align="initial">
        <Empty size="large">
          <Trans>
            Sorry, an unknown error occurred loading the page. Please try again
            or contact support if the issue persists.
          </Trans>
        </Empty>
        <HStack>
          <Button action={navigateToHome} neutral hideIcon>
            {t("Home")}
          </Button>
        </HStack>
      </VStack>
    </CenteredContent>
  );
};

export default ErrorUnknown;
