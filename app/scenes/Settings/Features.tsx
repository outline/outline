import { observer } from "mobx-react";
import { SparklesIcon } from "outline-icons";
import { useTranslation, Trans } from "react-i18next";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import Text from "~/components/Text";

function Features() {
  const { t } = useTranslation();

  return (
    <Scene title={t("AI")} icon={<SparklesIcon />}>
      <Heading>{t("AI")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          AI features are available in the licensed editions of Outline.
        </Trans>
      </Text>
    </Scene>
  );
}

export default observer(Features);
