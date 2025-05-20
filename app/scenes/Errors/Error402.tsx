import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import Flex from "@shared/components/Flex";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import Notice from "~/components/Notice";
import Scene from "~/components/Scene";

const Error402 = () => {
  const location = useLocation<{ title?: string }>();
  const { t } = useTranslation();
  const title = location.state?.title ?? t("Payment Required");

  return (
    <Scene title={title}>
      <Heading>{title}</Heading>
      <Flex style={{ maxWidth: 500 }} column>
        <Empty size="large">
          <Notice>
            This document cannot be viewed with the current edition. Please
            upgrade to a paid license to restore access.
          </Notice>
        </Empty>
      </Flex>
    </Scene>
  );
};

export default Error402;
