import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import { navigateToHome } from "~/actions/definitions/navigation";
import { HStack } from "~/components/primitives/HStack";
import { VStack } from "~/components/primitives/VStack";

const Error403 = () => {
  const { t } = useTranslation();
  const history = useHistory();

  return (
    <Scene title={t("No access to this doc")}>
      <Heading>{t("No access to this doc")}</Heading>
      <VStack spacing={20} style={{ maxWidth: 500 }} align="initial">
        <Empty size="large">
          {t(
            "It doesn’t look like you have permission to access this document."
          )}{" "}
          {t("Please request access from the document owner.")}
        </Empty>
        <HStack>
          <Button action={navigateToHome} hideIcon>
            {t("Home")}
          </Button>
          <Button onClick={history.goBack} neutral>
            {t("Go back")}
          </Button>
        </HStack>
      </VStack>
    </Scene>
  );
};

export default Error403;
