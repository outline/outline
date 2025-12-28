import { useTranslation, Trans } from "react-i18next";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import {
  navigateToHome,
  navigateToSearch,
} from "~/actions/definitions/navigation";
import { HStack } from "~/components/primitives/HStack";
import { VStack } from "~/components/primitives/VStack";

const Error404 = () => {
  const { t } = useTranslation();

  return (
    <Scene title={t("Not found")}>
      <Heading>{t("Not found")}</Heading>
      <VStack spacing={20} style={{ maxWidth: 500 }} align="initial">
        <Empty size="large">
          <Trans>
            The page you’re looking for cannot be found. It might have been
            deleted or the link is incorrect.
          </Trans>
        </Empty>
        <HStack>
          <Button action={navigateToHome} neutral hideIcon>
            {t("Home")}
          </Button>
          <Button action={navigateToSearch} neutral>
            {t("Search")}…
          </Button>
        </HStack>
      </VStack>
    </Scene>
  );
};

export default Error404;
