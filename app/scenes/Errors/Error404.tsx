import { useTranslation, Trans } from "react-i18next";
import Flex from "@shared/components/Flex";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import {
  navigateToHome,
  navigateToSearch,
} from "~/actions/definitions/navigation";
import useActionContext from "~/hooks/useActionContext";

const Error404 = () => {
  const { t } = useTranslation();
  const context = useActionContext();

  return (
    <Scene title={t("Not found")}>
      <Heading>{t("Not found")}</Heading>
      <Flex gap={20} style={{ maxWidth: 500 }} column>
        <Empty size="large">
          <Trans>
            The page you’re looking for cannot be found. It might have been
            deleted or the link is incorrect.
          </Trans>
        </Empty>
        <Flex gap={8}>
          <Button action={navigateToHome} context={context} hideIcon>
            {t("Home")}
          </Button>
          <Button action={navigateToSearch} context={context} neutral>
            {t("Search")}…
          </Button>
        </Flex>
      </Flex>
    </Scene>
  );
};

export default Error404;
