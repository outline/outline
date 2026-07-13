import { Trans, useTranslation } from "react-i18next";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import {
  navigateToHome,
  navigateToSearch,
} from "~/actions/definitions/navigation";
import { VStack } from "~/components/primitives/VStack";
import { HStack } from "~/components/primitives/HStack";

const ErrorExpiredLink = () => {
  const { t } = useTranslation();

  return (
    <Scene title={t("Expired Link")}>
      <Heading>{t("Expired Link")}</Heading>
      <VStack spacing={20} style={{ maxWidth: 500 }} align="initial">
        <Empty size="large">
          <Trans>
            This Link has expired or has been deactivated. Please contact a
            document admin to restore access.
          </Trans>
        </Empty>
        <HStack>
          <Button action={navigateToHome} neutral hideIcon>
            {t("Home")}
          </Button>
          <Button action={navigateToSearch} neutral>
            {t("Search")}...
          </Button>
        </HStack>
      </VStack>
    </Scene>
  );
};

export default ErrorExpiredLink;
