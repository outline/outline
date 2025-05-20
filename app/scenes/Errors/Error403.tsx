import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import Flex from "@shared/components/Flex";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import { navigateToHome } from "~/actions/definitions/navigation";
import useActionContext from "~/hooks/useActionContext";

const Error403 = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const context = useActionContext();

  return (
    <Scene title={t("No access to this doc")}>
      <Heading>{t("No access to this doc")}</Heading>
      <Flex gap={20} style={{ maxWidth: 500 }} column>
        <Empty size="large">
          {t(
            "It doesn’t look like you have permission to access this document."
          )}{" "}
          {t("Please request access from the document owner.")}
        </Empty>
        <Flex gap={8}>
          <Button action={navigateToHome} context={context} hideIcon>
            {t("Home")}
          </Button>
          <Button onClick={history.goBack} neutral>
            {t("Go back")}
          </Button>
        </Flex>
      </Flex>
    </Scene>
  );
};

export default Error403;
